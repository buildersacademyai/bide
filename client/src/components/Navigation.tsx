import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { UserProfile } from "./UserProfile";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getConnectedAccount, connectWallet } from "@/lib/web3";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

export function Navigation() {
  const [location] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isAppPage = location === "/app";

  const { data: address, isLoading } = useQuery({ 
    queryKey: ['wallet'],
    queryFn: getConnectedAccount,
    refetchOnWindowFocus: true,
    retry: false
  });

  const handleConnect = async () => {
    try {
      await connectWallet();
      await queryClient.invalidateQueries({ queryKey: ['wallet'] });
      toast({
        title: "Connected to wallet",
        description: "Successfully connected to MetaMask",
      });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Connection failed",
        description: err instanceof Error ? err.message : "Failed to connect wallet",
      });
    }
  };

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Button variant="ghost" className="p-0" asChild>
              <a href="/" className="flex items-center gap-2">
                <svg
                  className="h-8 w-8 text-primary"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z" />
                  <line x1="16" y1="8" x2="2" y2="22" />
                  <line x1="17.5" y1="15" x2="9" y2="15" />
                </svg>
                <span className="text-xl font-bold">Blockchain IDE</span>
              </a>
            </Button>
          </div>

          <div className="flex items-center gap-4">
            <Button variant="ghost" className="p-0" asChild>
              <a href="/about">About Us</a>
            </Button>

            {!isAppPage && (
              <Button variant="default" asChild>
                <a href="/app">Launch App</a>
              </Button>
            )}

            {isLoading ? (
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            ) : address ? (
              <UserProfile address={address} />
            ) : (
              <Button onClick={handleConnect} variant="default">
                Connect Wallet
              </Button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}