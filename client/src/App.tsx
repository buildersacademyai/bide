import { Switch, Route } from "wouter";
import { queryClient } from "@/lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Navigation } from "@/components/Navigation";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import About from "@/pages/about";
import Editor from "@/pages/editor";
import { AuthProvider, useAuth } from "@/lib/web3/auth-context";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

// Protected route component
function ProtectedRoute({ component: Component }: { component: () => JSX.Element }) {
  const { address, isConnecting } = useAuth();

  if (isConnecting) {
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
        <h2 className="text-2xl font-bold">Connect Your Wallet</h2>
        <p className="text-muted-foreground text-center max-w-md">
          Connect your wallet to access the IDE and manage your smart contracts.
          Your contracts and transactions will be associated with your wallet address.
        </p>
      </div>
    );
  }

  // If wallet is connected, render the protected component
  return <Component />;
}

function Router() {
  const { address } = useAuth();

  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/about" component={About} />
      {/* Automatically redirect to app if wallet is connected */}
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
      <AuthProvider>
        <div className="min-h-screen flex flex-col">
          <Navigation />
          <main className="flex-1">
            <Router />
          </main>
        </div>
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;