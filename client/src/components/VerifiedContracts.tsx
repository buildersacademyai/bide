import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
import type { DeployedContract } from '@/lib/web3/types';
import { EtherscanService } from '@/lib/web3/etherscan-service';

export function VerifiedContracts() {
  const [selectedContract, setSelectedContract] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: contracts, isLoading: isLoadingContracts } = useQuery({
    queryKey: ['/api/contracts'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/contracts');
        if (!response.ok) {
          throw new Error('Failed to fetch contracts');
        }
        const data = await response.json();
        console.log('Fetched contracts:', data); // Debug log
        return data as DeployedContract[];
      } catch (error) {
        console.error('Error fetching contracts:', error);
        throw error;
      }
    }
  });

  const { data: verifiedContracts, isLoading: isLoadingVerified } = useQuery({
    queryKey: ['/api/contracts/verified'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/contracts/verified');
        if (!response.ok) {
          throw new Error('Failed to fetch verified contracts');
        }
        const data = await response.json();
        console.log('Fetched verified contracts:', data); // Debug log
        return data as DeployedContract[];
      } catch (error) {
        console.error('Error fetching verified contracts:', error);
        throw error;
      }
    }
  });

  const handleVerify = async () => {
    if (!selectedContract) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please select a contract to verify"
      });
      return;
    }

    setIsVerifying(true);
    try {
      // Get the contract to verify
      const contract = contracts?.find(c => c.id.toString() === selectedContract);
      if (!contract) {
        throw new Error('Contract not found');
      }

      console.log('Starting verification for contract:', contract); // Debug log

      // Get contract data including source code
      const response = await fetch(`/api/contracts/${selectedContract}`);
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Contract data fetch error:', errorText); // Debug log
        throw new Error(`Failed to fetch contract data: ${errorText}`);
      }

      let contractData;
      try {
        const responseText = await response.text();
        console.log('Raw response:', responseText); // Debug log
        contractData = JSON.parse(responseText);
      } catch (e) {
        console.error('JSON parse error:', e);
        throw new Error('Invalid response format from server');
      }

      if (!contractData.source) {
        throw new Error('Contract source code not found');
      }

      toast({
        title: "Starting verification",
        description: "Verifying contract on Etherscan...",
      });

      // Start verification process
      const guid = await EtherscanService.verifyContract(
        contract.address,
        contractData.source,
        contract.name
      );

      console.log('Verification started with GUID:', guid); // Debug log

      // Poll for verification status
      const checkStatus = async () => {
        try {
          const status = await EtherscanService.checkVerificationStatus(guid);
          console.log('Verification status:', status); // Debug log

          if (status.status === 'pending') {
            // Check again in 5 seconds
            setTimeout(checkStatus, 5000);
          } else if (status.status === 'success') {
            // Update contract verification status in database
            const updateResponse = await fetch(`/api/contracts/${selectedContract}/verify`, {
              method: 'POST',
            });

            if (!updateResponse.ok) {
              throw new Error('Failed to update contract verification status');
            }

            toast({
              title: "Success",
              description: "Contract successfully verified on Etherscan"
            });

            // Refresh the contracts lists
            await queryClient.invalidateQueries({ queryKey: ['/api/contracts/verified'] });
          } else {
            throw new Error(status.message || 'Verification failed');
          }
        } catch (error) {
          console.error('Status check error:', error); // Debug log
          throw error;
        }
      };

      // Start checking status
      await checkStatus();
    } catch (error) {
      console.error('Verification error:', error);
      toast({
        variant: "destructive",
        title: "Verification failed",
        description: error instanceof Error ? error.message : 'Failed to verify contract'
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