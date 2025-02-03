import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Copy, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';

interface DeployedContract {
  id: number;
  name: string;
  address: string;
  network: string;
}

export function DeployedContracts() {
  const { toast } = useToast();
  const [copiedAddresses, setCopiedAddresses] = useState<{[key: number]: boolean}>({});

  const { data: contracts = [] } = useQuery<DeployedContract[]>({
    queryKey: ['/api/contracts'],
    select: (data) => data.filter(contract => contract.address),
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

  if (contracts.length === 0) {
    return (
      <Card className="p-6">
        <p className="text-center text-muted-foreground">No deployed contracts yet</p>
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
          </TableRow>
        </TableHeader>
        <TableBody>
          {contracts.map((contract) => (
            <TableRow key={contract.id}>
              <TableCell className="font-medium">{contract.name}</TableCell>
              <TableCell>{contract.network}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <code className="px-2 py-1 bg-muted rounded text-sm">
                    {contract.address.slice(0, 6)}...{contract.address.slice(-4)}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopyAddress(contract.address, contract.id)}
                  >
                    {copiedAddresses[contract.id] ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
