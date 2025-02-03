import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ethers } from 'ethers';
import { Loader2 } from 'lucide-react';

interface Props {
  address: string;
  abi: any[];
}

export function ContractInteraction({ address, abi }: Props) {
  const [results, setResults] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  const handleCall = async (functionName: string, inputs: any[]) => {
    setLoading(prev => ({ ...prev, [functionName]: true }));
    try {
      if (!window.ethereum) {
        throw new Error('MetaMask is not installed');
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(address, abi, signer);

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

  const renderFunctionForm = (func: any) => {
    const [inputValues, setInputValues] = useState<string[]>(
      Array(func.inputs.length).fill('')
    );

    return (
      <div key={func.name} className="p-4 border rounded-lg mb-4">
        <h3 className="text-lg font-semibold mb-2">{func.name}</h3>

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
          onClick={() => handleCall(func.name, inputValues)}
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

  if (!address) {
    return (
      <div className="text-center text-muted-foreground">
        Please deploy a contract first
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Contract Interaction</h2>
      <div className="mb-4">
        <Label>Contract Address</Label>
        <code className="block p-2 bg-muted rounded-md font-mono text-sm mt-1">
          {address}
        </code>
      </div>
      {abi.filter((func: any) => func.type === 'function')
         .map(renderFunctionForm)}
    </div>
  );
}