import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { createToastConfig } from '@/lib/toast-config';
import type { DeployedContract } from '@/lib/web3/types';

export function VerifiedContracts() {
  const [selectedContract, setSelectedContract] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const { toast } = useToast();

  const { data: contracts, isLoading: isLoadingContracts } = useQuery({
    queryKey: ['/api/contracts'],
    queryFn: async () => {
      const response = await fetch('/api/contracts');
      if (!response.ok) {
        throw new Error('Failed to fetch contracts');
      }
      return response.json() as Promise<DeployedContract[]>;
    }
  });

  const { data: verifiedContracts, isLoading: isLoadingVerified } = useQuery({
    queryKey: ['/api/contracts/verified'],
    queryFn: async () => {
      const response = await fetch('/api/contracts/verified');
      if (!response.ok) {
        throw new Error('Failed to fetch verified contracts');
      }
      return response.json() as Promise<DeployedContract[]>;
    }
  });

  const handleVerify = async () => {
    if (!selectedContract) return;

    setIsVerifying(true);
    try {
      const response = await fetch(`/api/contracts/${selectedContract}/verify`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to verify contract');
      }

      toast({
        ...createToastConfig({
          title: "Contract verified",
          description: "The contract has been successfully verified",
        })
      });

      // Refresh the verified contracts list
      await queryClient.invalidateQueries({ queryKey: ['/api/contracts/verified'] });
    } catch (error) {
      toast({
        ...createToastConfig({
          variant: "destructive",
          title: "Verification failed",
          description: error instanceof Error ? error.message : "Failed to verify contract",
        })
      });
    } finally {
      setIsVerifying(false);
    }
  };

  if (isLoadingContracts || isLoadingVerified) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const unverifiedContracts = contracts?.filter(c => 
    c.address && !verifiedContracts?.some(vc => vc.id === c.id)
  ) ?? [];

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h2 className="text-xl font-bold">Verify Contract</h2>
        <div className="flex gap-4">
          <Select
            value={selectedContract ?? undefined}
            onValueChange={setSelectedContract}
          >
            <SelectTrigger className="w-[300px]">
              <SelectValue placeholder="Select a contract to verify" />
            </SelectTrigger>
            <SelectContent>
              {unverifiedContracts.map((contract) => (
                <SelectItem key={contract.id} value={contract.id.toString()}>
                  {contract.name} ({contract.address.slice(0, 6)}...{contract.address.slice(-4)})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button 
            onClick={handleVerify} 
            disabled={!selectedContract || isVerifying}
          >
            {isVerifying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Verify Contract
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Verified Contracts</h3>
        {verifiedContracts?.length ? (
          <div className="space-y-3">
            {verifiedContracts.map((contract) => (
              <div
                key={contract.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="space-y-1">
                  <div className="font-medium">{contract.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {contract.address}
                  </div>
                </div>
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-muted-foreground p-8">
            No verified contracts yet
          </div>
        )}
      </div>
    </div>
  );
}
