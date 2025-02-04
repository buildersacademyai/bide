import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
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
import { useContractInteraction } from '@/hooks/use-contract-interaction';
import type { ContractFunction } from '@/lib/web3/types';

interface FunctionFormProps {
  func: ContractFunction;
  onSubmit: (inputs: string[]) => Promise<void>;
}

function FunctionForm({ func, onSubmit }: FunctionFormProps) {
  const [inputValues, setInputValues] = useState<string[]>(
    Array(func.inputs.length).fill('')
  );
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      await onSubmit(inputValues);
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

      {func.inputs.map((input, idx) => (
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
        onClick={handleSubmit}
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
  const {
    contracts,
    selectedContract,
    selectedContractData,
    results,
    isLoading,
    setSelectedContract,
    handleCall
  } = useContractInteraction();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!contracts.length) {
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
            {contracts.map((contract) => (
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
                Functions ({selectedContractData.abi.filter(item => item.type === 'function').length})
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 pt-4">
                  {selectedContractData.abi
                    .filter(item => item.type === 'function')
                    .map((func) => (
                      <div key={func.name}>
                        <FunctionForm
                          func={func}
                          onSubmit={(inputs) => handleCall(func.name, inputs)}
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
                Events ({selectedContractData.abi.filter(item => item.type === 'event').length})
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 pt-4">
                  {selectedContractData.abi
                    .filter(item => item.type === 'event')
                    .map((event) => (
                      <div key={event.name} className="p-4 border rounded-lg">
                        <h4 className="font-medium">{event.name}</h4>
                        <div className="mt-2 text-sm text-muted-foreground">
                          {event.inputs.map((input, idx) => (
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
                View Variables ({
                  selectedContractData.abi.filter(item => 
                    item.type === 'function' && 
                    item.stateMutability === 'view' && 
                    item.inputs.length === 0
                  ).length
                })
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 pt-4">
                  {selectedContractData.abi
                    .filter(item => 
                      item.type === 'function' && 
                      item.stateMutability === 'view' && 
                      item.inputs.length === 0
                    )
                    .map((variable) => (
                      <div key={variable.name}>
                        <FunctionForm
                          func={variable}
                          onSubmit={(inputs) => handleCall(variable.name, inputs)}
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