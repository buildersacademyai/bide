import { useState, useEffect } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { User, Loader2, LogOut, Wallet } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { ethers } from "ethers";

export function UserProfile({ address }: { address: string }) {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [balance, setBalance] = useState<string | null>(null);
  const [network, setNetwork] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogout = async () => {
    await queryClient.invalidateQueries({ queryKey: ['wallet'] });
    window.location.reload();
  };

  useEffect(() => {
    async function fetchWalletInfo() {
      if (!address || !isOpen || !window.ethereum) return;

      setIsLoading(true);
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
    }

    if (isOpen) {
      fetchWalletInfo();
    }
  }, [isOpen, address]);

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Wallet className="h-4 w-4" />
          <span className="hidden sm:inline">
            {address.slice(0, 6)}...{address.slice(-4)}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[300px]">
        <DropdownMenuLabel>
          <div className="space-y-4">
            <div>
              <div className="text-sm font-medium">Connected Wallet</div>
              <code className="text-xs text-muted-foreground block mt-1 bg-muted p-2 rounded">
                {address}
              </code>
            </div>

            {isLoading ? (
              <div className="flex justify-center p-2">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            ) : (
              <>
                {balance && (
                  <div>
                    <div className="text-sm font-medium">Balance</div>
                    <div className="text-sm text-muted-foreground">
                      {parseFloat(balance).toFixed(4)} ETH
                    </div>
                  </div>
                )}
                {network && (
                  <div>
                    <div className="text-sm font-medium">Network</div>
                    <div className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                      {network}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="p-2">
          <Button variant="ghost" size="sm" className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-100/50 dark:hover:bg-red-900/20" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Disconnect Wallet
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}