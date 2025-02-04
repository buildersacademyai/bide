import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Loader2, Terminal, Rocket } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { connectWallet, getConnectedAccount, deployContract } from '@/lib/web3';

interface Props {
  sourceCode: string;
  contractId: number | undefined;  // Added contractId prop
  onCompileSuccess?: (abi: any[], bytecode: string) => void;
}

export function ContractCompiler({ sourceCode, contractId, onCompileSuccess }: Props) {
  const { toast } = useToast();
  const [compiling, setCompiling] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [compiledContract, setCompiledContract] = useState<{ abi: any[], bytecode: string } | null>(null);

  const handleCompile = async () => {
    try {
      // Ensure wallet is connected before compilation
      const account = await connectWallet();
      if (!account) {
        throw new Error('Please connect your wallet first');
      }

      if (!sourceCode.trim()) {
        throw new Error('Source code cannot be empty');
      }

      if (!contractId) {
        throw new Error('No contract selected');
      }

      setCompiling(true);
      setError(null);

      const response = await fetch('/api/compile', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-wallet-address': account
        },
        body: JSON.stringify({ sourceCode, contractId })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Compilation failed');
      }

      setCompiledContract({ abi: data.abi, bytecode: data.bytecode });
      onCompileSuccess?.(data.abi, data.bytecode);

      toast({
        title: "Success",
        description: "Contract compiled successfully",
      });
    } catch (err) {
      console.error('Compilation error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Compilation failed';
      setError(errorMessage);
      toast({
        variant: "destructive",
        title: "Compilation failed",
        description: errorMessage,
      });
    } finally {
      setCompiling(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button 
          onClick={handleCompile} 
          disabled={compiling || !contractId}
          className="flex-1"
        >
          {compiling ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Terminal className="mr-2 h-4 w-4" />
          )}
          {compiling ? 'Compiling...' : 'Compile Contract'}
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}