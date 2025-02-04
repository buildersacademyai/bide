import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Loader2, Terminal, Rocket } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { connectWallet, getConnectedAccount, deployContract } from '@/lib/web3';

interface Props {
  sourceCode: string;
}

export function ContractCompiler({ sourceCode }: Props) {
  const { toast } = useToast();
  const [compiling, setCompiling] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [compiledContract, setCompiledContract] = useState<{ abi: any[], bytecode: string } | null>(null);
  const [deployedAddress, setDeployedAddress] = useState<string | null>(null);

  const handleDeploy = async () => {
    if (!compiledContract) {
      toast({
        variant: "destructive",
        title: "Compilation required",
        description: "Please compile the contract before deploying",
      });
      return;
    }

    setDeploying(true);
    setError(null);

    try {
      // Ensure wallet is connected
      await connectWallet();

      // Deploy contract
      const address = await deployContract(compiledContract.abi, compiledContract.bytecode);
      setDeployedAddress(address);

      toast({
        title: "Success",
        description: `Contract deployed at ${address}`,
      });
    } catch (err) {
      console.error('Deployment error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Deployment failed';
      setError(errorMessage);
      toast({
        variant: "destructive",
        title: "Deployment failed",
        description: errorMessage,
      });
    } finally {
      setDeploying(false);
    }
  };

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

      setCompiling(true);
      setError(null);

      const response = await fetch('/api/compile', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-wallet-address': account
        },
        body: JSON.stringify({ sourceCode })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Compilation failed');
      }

      setCompiledContract({ abi: data.abi, bytecode: data.bytecode });

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
          disabled={compiling}
          className="flex-1"
        >
          {compiling ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Terminal className="mr-2 h-4 w-4" />
          )}
          {compiling ? 'Compiling...' : 'Compile Contract'}
        </Button>

        {compiledContract && !compiling && (
          <Button onClick={handleDeploy} disabled={deploying} className="flex-1">
            {deploying ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Rocket className="mr-2 h-4 w-4" />
            )}
            {deploying ? 'Deploying...' : 'Deploy Contract'}
          </Button>
        )}
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error}
          </AlertDescription>
        </Alert>
      )}

      {deployedAddress && (
        <Alert>
          <AlertDescription>
            Contract deployed at: {deployedAddress}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}