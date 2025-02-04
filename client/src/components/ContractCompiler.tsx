import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card } from '@/components/ui/card';
import { AlertCircle, Loader2, Terminal, Rocket } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { getConnectedAccount, deployContract } from '@/lib/web3';

interface Props {
  sourceCode: string;
  contractId?: number;
  onCompileSuccess: (abi: any[], bytecode: string) => void;
}

export function ContractCompiler({ sourceCode, contractId, onCompileSuccess }: Props) {
  const { toast } = useToast();
  const [compiling, setCompiling] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastCompiledCode, setLastCompiledCode] = useState<string>('');
  const [compiledContract, setCompiledContract] = useState<{ abi: any[], bytecode: string } | null>(null);
  const queryClient = useQueryClient();
  const [connectedWallet, setConnectedWallet] = useState<string | null>(null);

  // Check wallet connection on mount and when account changes
  useEffect(() => {
    const checkWalletConnection = async () => {
      const account = await getConnectedAccount();
      setConnectedWallet(account);
    };

    checkWalletConnection();

    if (window.ethereum) {
      window.ethereum.on('accountsChanged', checkWalletConnection);
      return () => {
        window.ethereum.removeListener('accountsChanged', checkWalletConnection);
      };
    }
  }, []);

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
      toast({
        title: "Deploying contract",
        description: "Please confirm the transaction in your wallet...",
      });

      const address = await deployContract(compiledContract.abi, compiledContract.bytecode);

      toast({
        title: "Deployment successful",
        description: `Contract deployed at ${address}`,
      });

      // Clear compilation state after successful deployment
      setCompiledContract(null);
      setLastCompiledCode('');

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
    if (!connectedWallet) {
      toast({
        variant: "destructive",
        title: "Wallet not connected",
        description: "Please connect your wallet to compile contracts",
      });
      return;
    }

    // Skip if code hasn't changed since last compilation
    if (sourceCode === lastCompiledCode) {
      toast({
        title: "No changes detected",
        description: "The contract code hasn't changed since the last compilation.",
      });
      return;
    }

    if (!sourceCode.trim()) {
      setError('Source code cannot be empty');
      return;
    }

    setCompiling(true);
    setError(null);
    setCompiledContract(null);

    try {
      toast({
        title: "Compiling contract",
        description: "Please wait while the contract is being compiled...",
      });

      const response = await fetch('/api/compile', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-wallet-address': connectedWallet
        },
        body: JSON.stringify({ 
          sourceCode,
          contractId 
        })
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.errors) {
          setError(data.errors.map((e: any) => e.formattedMessage).join('\n'));
          toast({
            variant: "destructive",
            title: "Compilation failed",
            description: "Contract has compilation errors",
          });
          return;
        }
        throw new Error(data.message || 'Compilation failed');
      }

      setLastCompiledCode(sourceCode);
      setCompiledContract({ abi: data.abi, bytecode: data.bytecode });
      await queryClient.invalidateQueries({ queryKey: ['/api/contracts'] });

      toast({
        title: "Compilation successful",
        description: `Contract compiled successfully`,
      });

      onCompileSuccess(data.abi, data.bytecode);
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
          disabled={compiling || !sourceCode.trim() || !connectedWallet}
          className="flex-1"
        >
          {compiling ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Terminal className="mr-2 h-4 w-4" />
          )}
          {!connectedWallet 
            ? 'Connect Wallet to Compile' 
            : compiling 
              ? 'Compiling...' 
              : 'Compile Contract'
          }
        </Button>

        {compiledContract && !deploying && (
          <Button
            onClick={handleDeploy}
            disabled={!connectedWallet}
            className="flex-1"
          >
            <Rocket className="mr-2 h-4 w-4" />
            Deploy Contract
          </Button>
        )}

        {deploying && (
          <Button
            disabled
            className="flex-1"
          >
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Deploying...
          </Button>
        )}
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="whitespace-pre-wrap font-mono text-sm mt-2">
            {error}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}