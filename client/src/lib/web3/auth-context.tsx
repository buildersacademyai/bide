import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Web3AuthService } from './auth-service';
import { useToast } from '@/hooks/use-toast';

interface AuthContextType {
  address: string | null;
  isConnecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Check if user was previously connected
    const checkConnection = async () => {
      try {
        const currentAddress = await Web3AuthService.getCurrentAddress();
        if (currentAddress) {
          setAddress(currentAddress);
        }
      } catch (error) {
        console.error('Failed to check connection:', error);
      }
    };
    checkConnection();
  }, []);

  const connect = async () => {
    setIsConnecting(true);
    try {
      const address = await Web3AuthService.connect();
      setAddress(address);
      toast({
        title: "Connected",
        description: "Successfully connected to MetaMask",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Connection failed",
        description: error instanceof Error ? error.message : "Failed to connect to MetaMask",
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnect = async () => {
    try {
      await Web3AuthService.disconnect();
      setAddress(null);
      toast({
        title: "Disconnected",
        description: "Successfully disconnected from MetaMask",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Disconnection failed",
        description: "Failed to disconnect from MetaMask",
      });
    }
  };

  return (
    <AuthContext.Provider value={{ address, isConnecting, connect, disconnect }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
