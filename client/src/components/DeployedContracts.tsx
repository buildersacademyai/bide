import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Copy, Check, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { getConnectedAccount } from '@/lib/web3';

interface DeployedContract {
  id: number;
  name: string;
  address: string | null;
  network: string;
  ownerAddress: string;
}

export function DeployedContracts() {
  const { toast } = useToast();
  const [copiedAddresses, setCopiedAddresses] = useState<{[key: number]: boolean}>({});
  const [connectedAddress, setConnectedAddress] = useState<string | null>(null);

  useEffect(() => {
    const checkWallet = async () => {
      const account = await getConnectedAccount();
      setConnectedAddress(account);
    };
    checkWallet();
  }, []);

  const { data: contracts = [], isLoading } = useQuery<DeployedContract[]>({
    queryKey: ['/api/contracts'],
    queryFn: async () => {
      try {
        if (!connectedAddress) {
          return [];
        }

        const response = await fetch('/api/contracts', {
          headers: {
            'x-wallet-address': connectedAddress
          }
        });
        if (!response.ok) {
          throw new Error('Failed to fetch contracts');
        }
        const data = await response.json();

        // Filter for only successfully deployed contracts
        return data.filter((contract: DeployedContract) => 
          // Show only deployed contracts (with valid address) owned by the current user
          contract.address && 
          contract.address.startsWith('0x') &&  // Ensure it's a valid Ethereum address
          contract.address.length === 42 && // Standard Ethereum address length
          (!contract.ownerAddress || contract.ownerAddress === connectedAddress)
        );
      } catch (error) {
        console.error('Error fetching contracts:', error);
        return [];
      }
    },
    enabled: !!connectedAddress,
    staleTime: 1000 * 30, // Cache for 30 seconds
  });

  const handleCopyAddress = async (address: string, contractId: number) => {
    await navigator.clipboard.writeText(address);
    setCopiedAddresses(prev => ({ ...prev, [contractId]: true }));
    toast({
      title: "Copied!",
      description: "Contract address copied to clipboard",
    });
    setTimeout(() => {
      setCopiedAddresses(prev => ({ ...prev, [contractId]: false }));
    }, 2000);
  };

  const getExplorerUrl = (address: string, network: string) => {
    const baseUrl = network.toLowerCase() === 'sepolia' 
      ? 'https://sepolia.etherscan.io/address/'
      : 'https://goerli.etherscan.io/address/';
    return `${baseUrl}${address}`;
  };

  if (!connectedAddress) {
    return (
      <Card className="p-6">
        <p className="text-center text-muted-foreground">
          Please connect your wallet to view your deployed contracts
        </p>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </Card>
    );
  }

  if (contracts.length === 0) {
    return (
      <Card className="p-6">
        <p className="text-center text-muted-foreground">No deployed contracts found</p>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Contract Name</TableHead>
            <TableHead>Network</TableHead>
            <TableHead>Address</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {contracts.map((contract) => (
            <TableRow key={contract.id}>
              <TableCell className="font-medium">{contract.name}</TableCell>
              <TableCell>
                <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-green-100 text-green-800">
                  {contract.network}
                </span>
              </TableCell>
              <TableCell>
                {contract.address && (
                  <code className="px-2 py-1 bg-muted rounded text-sm">
                    {contract.address.slice(0, 6)}...{contract.address.slice(-4)}
                  </code>
                )}
              </TableCell>
              <TableCell>
                {contract.address && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopyAddress(contract.address!, contract.id)}
                    >
                      {copiedAddresses[contract.id] ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(getExplorerUrl(contract.address!, contract.network), '_blank')}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}