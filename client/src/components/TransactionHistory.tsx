import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Props {
  address?: string;
}

interface Transaction {
  hash: string;
  from: string;
  to: string;
  value: string;
  timestamp: number;
}

export function TransactionHistory({ address }: Props) {
  const { toast } = useToast();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTransactions() {
      if (!address || !window.ethereum) return;

      setIsLoading(true);
      setError(null);

      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const currentBlock = await provider.getBlockNumber();
        const lastBlock = Math.max(0, currentBlock - 100); // Get last 100 blocks

        const txPromises = [];
        for (let i = currentBlock; i >= lastBlock; i--) {
          txPromises.push(provider.getBlock(i, true));
        }

        const blocks = await Promise.all(txPromises);
        const formattedTransactions: Transaction[] = [];

        for (const block of blocks) {
          if (!block || !block.transactions) continue;

          const txs = block.transactions.filter(tx => 
            tx.from.toLowerCase() === address.toLowerCase() || 
            (tx.to && tx.to.toLowerCase() === address.toLowerCase())
          );

          for (const tx of txs) {
            formattedTransactions.push({
              hash: tx.hash,
              from: tx.from,
              to: tx.to || 'Contract Creation',
              value: ethers.formatEther(tx.value),
              timestamp: Number(block.timestamp)
            });
          }
        }

        setTransactions(formattedTransactions.sort((a, b) => b.timestamp - a.timestamp));
      } catch (err) {
        console.error('Error fetching transactions:', err);
        setError('Failed to fetch transaction history');
        toast({
          variant: "destructive",
          title: "Error fetching transactions",
          description: err instanceof Error ? err.message : "Failed to fetch transactions",
        });
      } finally {
        setIsLoading(false);
      }
    }

    fetchTransactions();
  }, [address, toast]);

  if (!address) {
    return (
      <Card className="p-6">
        <div className="text-center text-muted-foreground">
          Connect your wallet to view transaction history
        </div>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="text-center text-destructive">
          {error}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => window.location.reload()}
            className="mt-2"
          >
            Retry
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <ScrollArea className="h-[400px] pr-4">
      <div className="space-y-4">
        {transactions.map((tx) => (
          <div
            key={tx.hash}
            className="p-4 border rounded-lg hover:border-primary/50 transition-colors"
          >
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant={tx.from.toLowerCase() === address.toLowerCase() ? "destructive" : "outline"}>
                    {tx.from.toLowerCase() === address.toLowerCase() ? 'Sent' : 'Received'}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {new Date(tx.timestamp * 1000).toLocaleString()}
                  </span>
                </div>
                <div className="space-y-1">
                  <div className="text-sm">
                    <span className="text-muted-foreground">From: </span>
                    <code className="text-xs bg-muted px-1 py-0.5 rounded">
                      {tx.from.slice(0, 8)}...{tx.from.slice(-6)}
                    </code>
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground">To: </span>
                    <code className="text-xs bg-muted px-1 py-0.5 rounded">
                      {typeof tx.to === 'string' ? `${tx.to.slice(0, 8)}...${tx.to.slice(-6)}` : tx.to}
                    </code>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-medium">{tx.value} ETH</div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs"
                  onClick={() => window.open(`https://etherscan.io/tx/${tx.hash}`, '_blank')}
                >
                  View <ExternalLink className="h-3 w-3 ml-1" />
                </Button>
              </div>
            </div>
          </div>
        ))}
        {transactions.length === 0 && (
          <div className="text-center text-muted-foreground py-8">
            No transactions found
          </div>
        )}
      </div>
    </ScrollArea>
  );
}