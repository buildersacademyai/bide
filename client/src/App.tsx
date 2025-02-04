import { Switch, Route } from "wouter";
import { queryClient } from "@/lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Navigation } from "@/components/Navigation";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import About from "@/pages/about";
import Editor from "@/pages/editor";
import { Web3AuthService } from "@/lib/web3/auth-service";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

// Protected route component
function ProtectedRoute({ component: Component }: { component: () => JSX.Element }) {
  const { toast } = useToast();
  const { data: address, isLoading } = useQuery({ 
    queryKey: ['wallet'],
    queryFn: Web3AuthService.getCurrentAddress,
    refetchOnWindowFocus: true
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // If no wallet is connected, show connect wallet UI
  if (!address) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen space-y-4">
        <div className="text-center space-y-2">
          <Wallet className="h-12 w-12 mx-auto text-primary" />
          <h2 className="text-2xl font-bold">Connect Your Wallet</h2>
          <p className="text-muted-foreground text-center max-w-md mx-auto">
            To access the Blockchain IDE, please connect your wallet. Your smart contracts and transactions will be associated with your wallet address.
          </p>
        </div>
        <Button 
          onClick={async () => {
            try {
              const addr = await Web3AuthService.connect();
              // Get JWT token from backend
              const res = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ wallet_address: addr })
              });

              if (!res.ok) throw new Error('Failed to login');
              const { token } = await res.json();
              localStorage.setItem('token', token);

              toast({
                title: "Connected Successfully",
                description: "Your wallet has been connected."
              });

              // Force refetch wallet status
              queryClient.invalidateQueries({ queryKey: ['wallet'] });
            } catch (error) {
              toast({
                variant: "destructive",
                title: "Connection Failed",
                description: error instanceof Error ? error.message : "Failed to connect wallet"
              });
            }
          }} 
          size="lg"
        >
          Connect MetaMask
        </Button>
      </div>
    );
  }

  // If wallet is connected, render the protected component
  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/about" component={About} />
      <Route path="/app">
        {() => <ProtectedRoute component={Editor} />}
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen flex flex-col">
        <Navigation />
        <main className="flex-1">
          <Router />
        </main>
      </div>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;