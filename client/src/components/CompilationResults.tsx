import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Copy, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';

interface CompilationResult {
  id: number;
  name: string;
  abi: any[];
  bytecode: string;
}

export function CompilationResults() {
  const { toast } = useToast();
  const [copiedStates, setCopiedStates] = useState<{[key: string]: boolean}>({});

  const { data: contracts = [] } = useQuery<CompilationResult[]>({
    queryKey: ['/api/contracts'],
    select: (data) => data.filter(contract => contract.abi && contract.bytecode),
  });

  const handleCopy = async (text: string, type: string, contractId: number) => {
    await navigator.clipboard.writeText(text);
    setCopiedStates(prev => ({ ...prev, [`${contractId}-${type}`]: true }));
    toast({
      title: "Copied!",
      description: `${type} copied to clipboard`,
    });
    setTimeout(() => {
      setCopiedStates(prev => ({ ...prev, [`${contractId}-${type}`]: false }));
    }, 2000);
  };

  if (contracts.length === 0) {
    return (
      <Card className="p-6">
        <p className="text-center text-muted-foreground">No compiled contracts yet</p>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Contract Name</TableHead>
            <TableHead>ABI</TableHead>
            <TableHead>Bytecode</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {contracts.map((contract) => (
            <TableRow key={contract.id}>
              <TableCell className="font-medium">{contract.name}</TableCell>
              <TableCell>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopy(JSON.stringify(contract.abi), 'ABI', contract.id)}
                >
                  {copiedStates[`${contract.id}-ABI`] ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                  <span className="ml-2">Copy ABI</span>
                </Button>
              </TableCell>
              <TableCell>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopy(contract.bytecode, 'Bytecode', contract.id)}
                >
                  {copiedStates[`${contract.id}-Bytecode`] ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                  <span className="ml-2">Copy Bytecode</span>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
