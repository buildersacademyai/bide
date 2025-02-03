import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ethers } from 'ethers';
import { Loader2, ChevronDown } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export function ContractInteraction() {
  const [selectedContract, setSelectedContract] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  // Fetch all deployed contracts
  const { data: contracts, isLoading: isLoadingContracts } = useQuery({
    queryKey: ['/api/contracts'],
    queryFn: async () => {
      const response = await fetch('/api/contracts');
      if (!response.ok) {
        throw new Error('Failed to fetch contracts');
      }
      return response.json();
    }
  });

  const handleCall = async (functionName: string, inputs: any[], contractAddress: string, abi: any[]) => {
    setLoading(prev => ({ ...prev, [functionName]: true }));
    try {
      if (!window.ethereum) {
        throw new Error('MetaMask is not installed');
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(contractAddress, abi, signer);

      // Convert input values based on parameter types
      const functionAbi = abi.find(item => item.name === functionName);
      const convertedInputs = inputs.map((value, index) => {
        const type = functionAbi?.inputs[index].type;
        if (type?.startsWith('uint')) {
          return ethers.parseUnits(value || '0', 0);
        }
        return value;
      });

      const result = await contract[functionName](...convertedInputs);

      // Handle different types of return values
      let displayResult = result;
      if (ethers.isAddress(result)) {
        displayResult = result;
      } else if (typeof result === 'bigint') {
        displayResult = result.toString();
      }

      setResults(prev => ({ ...prev, [functionName]: displayResult }));
    } catch (err) {
      console.error('Contract call error:', err);
      setResults(prev => ({ 
        ...prev, 
        [functionName]: err instanceof Error ? err.message : 'Call failed' 
      }));
    } finally {
      setLoading(prev => ({ ...prev, [functionName]: false }));
    }
  };

  const renderFunctionForm = (func: any, contractAddress: string, abi: any[]) => {
    const [inputValues, setInputValues] = useState<string[]>(
      Array(func.inputs.length).fill('')
    );

    return (
      <div key={func.name} className="p-4 border rounded-lg mb-4">
        <div className="flex items-center gap-2 mb-2">
          <h3 className="text-lg font-semibold">{func.name}</h3>
          <span className="text-xs px-2 py-1 rounded-full bg-muted">
            {func.stateMutability}
          </span>
        </div>

        {func.inputs.map((input: any, idx: number) => (
          <div key={idx} className="mb-2">
            <Label>{input.name} ({input.type})</Label>
            <Input
              value={inputValues[idx]}
              onChange={e => {
                const newValues = [...inputValues];
                newValues[idx] = e.target.value;
                setInputValues(newValues);
              }}
              placeholder={input.type}
            />
          </div>
        ))}

        <Button
          onClick={() => handleCall(func.name, inputValues, contractAddress, abi)}
          disabled={loading[func.name]}
          className="mt-2"
        >
          {loading[func.name] && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {func.stateMutability === 'view' ? 'Call' : 'Send'}
        </Button>

        {results[func.name] && (
          <div className="mt-2">
            <Label>Result:</Label>
            <div className="p-2 bg-muted rounded-md font-mono text-sm">
              {results[func.name]}
            </div>
          </div>
        )}
      </div>
    );
  };

  if (isLoadingContracts) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const deployedContracts = contracts?.filter((c: any) => c.address && c.abi);

  if (!deployedContracts?.length) {
    return (
      <div className="text-center text-muted-foreground p-8">
        No deployed contracts found. Deploy a contract first to interact with it.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold mb-4">Contract Interaction</h2>
        <Select
          value={selectedContract ?? undefined}
          onValueChange={setSelectedContract}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a contract to interact with" />
          </SelectTrigger>
          <SelectContent>
            {deployedContracts.map((contract: any) => (
              <SelectItem key={contract.id} value={contract.id.toString()}>
                {contract.name} ({contract.address.slice(0, 6)}...{contract.address.slice(-4)})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedContract && (
        <div className="space-y-6">
          {(() => {
            const contract = deployedContracts.find(
              (c: any) => c.id.toString() === selectedContract
            );
            if (!contract) return null;

            const functions = contract.abi.filter((item: any) => item.type === 'function');
            const events = contract.abi.filter((item: any) => item.type === 'event');
            const variables = functions.filter((item: any) => 
              item.stateMutability === 'view' && 
              item.inputs.length === 0
            );

            return (
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="functions">
                  <AccordionTrigger className="text-lg font-semibold">
                    Functions ({functions.length})
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4 pt-4">
                      {functions.map((func: any) => 
                        renderFunctionForm(func, contract.address, contract.abi)
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="events">
                  <AccordionTrigger className="text-lg font-semibold">
                    Events ({events.length})
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4 pt-4">
                      {events.map((event: any) => (
                        <div key={event.name} className="p-4 border rounded-lg">
                          <h4 className="font-medium">{event.name}</h4>
                          <div className="mt-2 text-sm text-muted-foreground">
                            {event.inputs.map((input: any, idx: number) => (
                              <div key={idx}>
                                {input.name} ({input.type})
                                {input.indexed && ' [indexed]'}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="variables">
                  <AccordionTrigger className="text-lg font-semibold">
                    View Variables ({variables.length})
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4 pt-4">
                      {variables.map((variable: any) => 
                        renderFunctionForm(variable, contract.address, contract.abi)
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            );
          })()}
        </div>
      )}
    </div>
  );
}