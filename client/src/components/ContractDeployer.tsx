import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card } from '@/components/ui/card';
import { AlertCircle, Loader2, Rocket } from 'lucide-react';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { deployContract } from '@/lib/web3';

interface Props {
  contractId: number;
  abi: any[];
  bytecode: string;
}

const NETWORKS = [
  { id: 'sepolia', name: 'Sepolia Testnet' },
  { id: 'goerli', name: 'Goerli Testnet' },
];

export function ContractDeployer({ contractId, abi, bytecode }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [deploying, setDeploying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedNetwork, setSelectedNetwork] = useState<string>('sepolia');

  const handleDeploy = async () => {
    if (!abi || !bytecode) {
      setError('Contract ABI and bytecode are required');
      return;
    }

    setDeploying(true);
    setError(null);

    try {
      toast({
        title: "Deploying contract",
        description: "Please confirm the transaction in MetaMask...",
      });

      const address = await deployContract(abi, bytecode);

      // Update contract in database with deployment info
      const response = await fetch(`/api/contracts/${contractId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address,
          network: selectedNetwork,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update contract deployment info');
      }

      // Refresh contracts list
      await queryClient.invalidateQueries({ queryKey: ['/api/contracts'] });

      toast({
        title: "Contract deployed",
        description: `Successfully deployed to ${address}`,
      });
    } catch (err) {
      console.error('Deployment error:', err);
      setError(err instanceof Error ? err.message : 'Failed to deploy contract');
      toast({
        variant: "destructive",
        title: "Deployment failed",
        description: err instanceof Error ? err.message : "Failed to deploy contract",
      });
    } finally {
      setDeploying(false);
    }
  };

  return (
    <Card className="">
      <div className="">
        {/* <div>
          <h3 className="text-lg font-semibold mb-2">Deploy Contract</h3>
          <p className="text-muted-foreground mb-4">
            Deploy your compiled contract to the Ethereum testnet.
          </p>
        </div> */}

        <div className="">
          {/* <div>
            <label className="text-sm font-medium mb-2 block">
              Select Network
            </label>
            <Select
              value={selectedNetwork}
              onValueChange={setSelectedNetwork}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {NETWORKS.map((network) => (
                  <SelectItem key={network.id} value={network.id}>
                    {network.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div> */}

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
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </div>
    </Card>
  );
}