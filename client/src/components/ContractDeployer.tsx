import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card } from '@/components/ui/card';
import { AlertCircle, Loader2 } from 'lucide-react';
import { deployContract } from '@/lib/web3';
import { apiRequest } from '@/lib/queryClient';

interface Props {
  abi: any[];
  bytecode: string;
  onDeploySuccess: (address: string) => void;
}

export function ContractDeployer({ abi, bytecode, onDeploySuccess }: Props) {
  const [deploying, setDeploying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDeploy = async () => {
    setDeploying(true);
    setError(null);

    try {
      const address = await deployContract(abi, bytecode);
      onDeploySuccess(address);
      
      await apiRequest('PATCH', '/api/contracts', {
        address,
        abi,
        bytecode
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Deployment failed');
    } finally {
      setDeploying(false);
    }
  };

  if (!abi || !bytecode) {
    return null;
  }

  return (
    <Card className="p-4">
      <Button
        onClick={handleDeploy}
        disabled={deploying}
        className="w-full"
      >
        {deploying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Deploy Contract
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
