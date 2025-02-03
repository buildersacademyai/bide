import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { ethers } from 'ethers';
import { Loader2 } from 'lucide-react';

interface Props {
  address: string;
}

export function WalletInfo({ address }: Props) {
  const [balance, setBalance] = useState<string | null>(null);
  const [network, setNetwork] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchWalletInfo = async () => {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        
        // Get balance
        const balance = await provider.getBalance(address);
        setBalance(ethers.formatEther(balance));

        // Get network
        const network = await provider.getNetwork();
        setNetwork(network.name);
      } catch (error) {
        console.error('Error fetching wallet info:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (address) {
      fetchWalletInfo();
    }
  }, [address]);

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-4">Wallet Information</h3>
        <div className="space-y-2">
          <div>
            <span className="text-muted-foreground">Address:</span>
            <code className="ml-2 px-2 py-1 bg-muted rounded text-sm">
              {address.slice(0, 6)}...{address.slice(-4)}
            </code>
          </div>
          {balance && (
            <div>
              <span className="text-muted-foreground">Balance:</span>
              <span className="ml-2 font-medium">{parseFloat(balance).toFixed(4)} ETH</span>
            </div>
          )}
          {network && (
            <div>
              <span className="text-muted-foreground">Network:</span>
              <span className="ml-2 inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-green-100 text-green-800">
                {network}
              </span>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
