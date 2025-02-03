import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ethers } from 'ethers';
import { Loader2 } from 'lucide-react';
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

// Helper function to format result values
function formatResult(result: any): string {
  if (result === null || result === undefined) {
    return 'No value';
  }
  if (result._isBigNumber || typeof result === 'bigint') {
    return result.toString();
  }
  if (Array.isArray(result)) {
    return result.map(item => formatResult(item)).join(', ');
  }
  if (typeof result === 'object') {
    try {
      return JSON.stringify(result, (_, value) =>
        typeof value === 'bigint' ? value.toString() : value
      , 2);
    } catch (e) {
      return 'Complex object';
    }
  }
  return String(result);
}

// Separate component for function form to properly handle state
function FunctionForm({ func, contractAddress, abi, onResult }: {
  func: any;
  contractAddress: string;
  abi: any[];
  onResult: (functionName: string, result: string) => void;
}) {
  const [inputValues, setInputValues] = useState<string[]>(Array(func.inputs.length).fill(''));
  const [isLoading, setIsLoading] = useState(false);

  const handleCall = async () => {
    setIsLoading(true);
    try {
      if (!window.ethereum) {
        throw new Error('MetaMask is not installed');
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(contractAddress, abi, signer);

      // Convert input values based on parameter types
      const convertedInputs = inputValues.map((value, index) => {
        const type = func.inputs[index].type;
        if (type?.startsWith('uint')) {
          return ethers.parseUnits(value || '0', 0);
        }
        return value;
      });

      const result = await contract[func.name](...convertedInputs);
      onResult(func.name, formatResult(result));
    } catch (err) {
      console.error('Contract call error:', err);
      onResult(func.name, err instanceof Error ? err.message : 'Call failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4 border rounded-lg mb-4">
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
        onClick={handleCall}
        disabled={isLoading}
        className="mt-2"
      >
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {func.stateMutability === 'view' ? 'Call' : 'Send'}
      </Button>
    </div>
  );
}

export function ContractInteraction() {
  const [selectedContract, setSelectedContract] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, string>>({});

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

  const handleResult = (functionName: string, result: string) => {
    setResults(prev => ({ ...prev, [functionName]: result }));
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

  const selectedContractData = selectedContract 
    ? deployedContracts.find((c: any) => c.id.toString() === selectedContract)
    : null;

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

      {selectedContractData && (
        <div className="space-y-6">
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="functions">
              <AccordionTrigger className="text-lg font-semibold">
                Functions ({selectedContractData.abi.filter((item: any) => item.type === 'function').length})
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 pt-4">
                  {selectedContractData.abi
                    .filter((item: any) => item.type === 'function')
                    .map((func: any) => (
                      <div key={func.name}>
                        <FunctionForm
                          func={func}
                          contractAddress={selectedContractData.address}
                          abi={selectedContractData.abi}
                          onResult={handleResult}
                        />
                        {results[func.name] && (
                          <div className="mt-2 p-2 bg-muted rounded-md">
                            <Label>Result:</Label>
                            <pre className="font-mono text-sm whitespace-pre-wrap break-all">
                              {results[func.name]}
                            </pre>
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="events">
              <AccordionTrigger className="text-lg font-semibold">
                Events ({selectedContractData.abi.filter((item: any) => item.type === 'event').length})
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 pt-4">
                  {selectedContractData.abi
                    .filter((item: any) => item.type === 'event')
                    .map((event: any) => (
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
                View Variables ({selectedContractData.abi.filter((item: any) => 
                  item.type === 'function' && 
                  item.stateMutability === 'view' && 
                  item.inputs.length === 0
                ).length})
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 pt-4">
                  {selectedContractData.abi
                    .filter((item: any) => 
                      item.type === 'function' && 
                      item.stateMutability === 'view' && 
                      item.inputs.length === 0
                    )
                    .map((variable: any) => (
                      <div key={variable.name}>
                        <FunctionForm
                          func={variable}
                          contractAddress={selectedContractData.address}
                          abi={selectedContractData.abi}
                          onResult={handleResult}
                        />
                        {results[variable.name] && (
                          <div className="mt-2 p-2 bg-muted rounded-md">
                            <Label>Value:</Label>
                            <pre className="font-mono text-sm whitespace-pre-wrap break-all">
                              {results[variable.name]}
                            </pre>
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      )}
    </div>
  );
}