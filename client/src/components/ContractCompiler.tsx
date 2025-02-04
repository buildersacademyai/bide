import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card } from '@/components/ui/card';
import { AlertCircle, Loader2, Terminal } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { getConnectedAccount } from '@/lib/web3';

interface Props {
  sourceCode: string;
  contractId?: number;
  onCompileSuccess: (abi: any[], bytecode: string) => void;
}

export function ContractCompiler({ sourceCode, contractId, onCompileSuccess }: Props) {
  const { toast } = useToast();
  const [compiling, setCompiling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastCompiledCode, setLastCompiledCode] = useState<string>('');
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
    <>
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

      {error && (
        <Alert variant="destructive" className="mt-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="whitespace-pre-wrap font-mono text-sm mt-2">
            {error}
          </AlertDescription>
        </Alert>
      )}
    </>
  );
}