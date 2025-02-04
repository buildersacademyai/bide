import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ContractService } from '@/lib/web3/contract-service';
import type { DeployedContract } from '@/lib/web3/types';

export function useContractInteraction() {
  const [selectedContract, setSelectedContract] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, string>>({});

  const { data: contracts, isLoading } = useQuery({
    queryKey: ['/api/contracts'],
    queryFn: async () => {
      const response = await fetch('/api/contracts');
      if (!response.ok) {
        throw new Error('Failed to fetch contracts');
      }
      return response.json() as Promise<DeployedContract[]>;
    }
  });

  const deployedContracts = contracts?.filter(c => c.address && c.abi) ?? [];

  const selectedContractData = selectedContract
    ? deployedContracts.find(c => c.id.toString() === selectedContract)
    : null;

  const handleCall = async (
    functionName: string,
    inputs: string[]
  ): Promise<void> => {
    if (!selectedContractData) return;

    const result = await ContractService.callFunction(
      selectedContractData.address,
      selectedContractData.abi,
      functionName,
      inputs
    );

    setResults(prev => ({
      ...prev,
      [functionName]: result.success ? result.result : result.error
    }));
  };

  return {
    contracts: deployedContracts,
    selectedContract,
    selectedContractData,
    results,
    isLoading,
    setSelectedContract,
    handleCall
  };
}
