import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card } from '@/components/ui/card';
import { AlertCircle, Loader2, Rocket } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { deployContract, getConnectedAccount } from '@/lib/web3';

interface Props {
  contractId: number;
  abi: any[];
  bytecode: string;
}

export function ContractDeployer({ contractId, abi, bytecode }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [deploying, setDeploying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDeploy = async () => {
    if (!abi || !bytecode) {
      setError('Contract ABI and bytecode are required');
      return;
    }

    setDeploying(true);
    setError(null);

    try {
      // Get the connected wallet address first
      const account = await getConnectedAccount();
      if (!account) {
        throw new Error('Please connect your wallet first');
      }

      toast({
        title: "Deploying contract",
        description: "Please confirm the transaction in MetaMask...",
      });

      // Deploy the contract
      const address = await deployContract(abi, bytecode);
      if (!address) {
        throw new Error('Failed to get deployed contract address');
      }

      // Update contract in database with deployment info
      const response = await fetch(`/api/contracts/${contractId}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'x-wallet-address': account // Add wallet address header
        },
        body: JSON.stringify({
          address,
          network: 'sepolia', // Using Sepolia as default testnet
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update contract deployment info');
      }

      // Refresh contracts list
      await queryClient.invalidateQueries({ queryKey: ['/api/contracts'] });

      toast({
        title: "Contract deployed",
        description: `Successfully deployed to ${address}`,
      });
    } catch (err) {
      console.error('Deployment error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to deploy contract';
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

  return (
    <Card>
      <Button
        onClick={handleDeploy}
        disabled={deploying || !abi || !bytecode}
        className="w-full"
      >
        {deploying ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Rocket className="mr-2 h-4 w-4" />
        )}
        {deploying ? 'Deploying...' : 'Deploy Contract'}
      </Button>

      {error && (
        <Alert variant="destructive" className="mt-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </Card>
  );
}