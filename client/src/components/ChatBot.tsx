import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bot, X, Send, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { getConnectedAccount } from '@/lib/web3';
import { ethers } from 'ethers';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatResponse {
  message: string;
  contractCode?: string;
  contractName?: string;
  contractId?: number;
  action?: 'compile' | 'deploy';
  success?: boolean;
  compilation?: any;
  deployment?: {
    bytecode: string;
    abi: any[];
  };
}

interface Props {
  onFileSelect?: (content: string, contractId: number) => void;
  onCompile?: (compilationResult: any) => Promise<boolean>;
  onDeploy?: (deploymentResult: any) => Promise<boolean>;
  currentContractId?: number;
}

export function ChatBot({ onFileSelect, onCompile, onDeploy, currentContractId }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [connectedAddress, setConnectedAddress] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    const checkWallet = async () => {
      try {
        const account = await getConnectedAccount();
        if (account !== connectedAddress) {
          setConnectedAddress(account);
          if (account) {
            await queryClient.invalidateQueries({ queryKey: ['/api/contracts'] });
          }
        }
      } catch (error) {
        console.error('Error checking wallet:', error);
        toast({
          variant: "destructive",
          title: "Wallet Connection Error",
          description: error instanceof Error ? error.message : "Failed to connect to wallet"
        });
      }
    };

    checkWallet();
    const interval = setInterval(checkWallet, 1000);
    return () => clearInterval(interval);
  }, [connectedAddress, queryClient, toast]);

  const deployContract = async (bytecode: string, abi: any[]) => {
    try {
      if (!window.ethereum) {
        throw new Error('MetaMask not detected. Please install MetaMask to deploy contracts.');
      }

      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts found. Please connect your wallet.');
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      const factory = new ethers.ContractFactory(abi, bytecode, signer);
      const contract = await factory.deploy();
      await contract.waitForDeployment();

      const address = await contract.getAddress();
      const deployTransaction = contract.deploymentTransaction();

      if (!deployTransaction) {
        throw new Error('No deployment transaction found');
      }

      const network = await provider.getNetwork();

      return {
        address,
        network: network.name.toLowerCase(),
        transactionHash: deployTransaction.hash
      };
    } catch (error: any) {
      throw new Error(`Deployment failed: ${error.message}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    // Check wallet connection first
    try {
      const account = await getConnectedAccount();
      if (!account) {
        toast({
          variant: "destructive",
          title: "Wallet not connected",
          description: "Please connect your MetaMask wallet to continue.",
        });
        return;
      }
      setConnectedAddress(account);
    } catch (error) {
      console.error('Wallet connection error:', error);
      toast({
        variant: "destructive",
        title: "Wallet Connection Error",
        description: "Failed to connect to your wallet. Please make sure MetaMask is installed and unlocked."
      });
      return;
    }

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-wallet-address': connectedAddress || ''
        },
        body: JSON.stringify({ 
          message: userMessage,
          contractId: currentContractId
        }),
      });

      if (!response.ok) {
        let errorMessage = 'Failed to get response';
        try {
          const errorData = await response.json();
          errorMessage = errorData.details || errorData.message || errorMessage;
        } catch (e) {
          // If parsing fails, use the status text
          errorMessage = response.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const data: ChatResponse = await response.json();

      if (data.action === 'compile') {
        if (!data.success) {
          setMessages(prev => [...prev, { 
            role: 'assistant', 
            content: data.message || 'Compilation failed. Please check your code and try again.'
          }]);
          return;
        }

        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: 'Contract compiled successfully! You can now deploy it if you wish.' 
        }]);

        if (onCompile && data.compilation) {
          await onCompile(data.compilation);
        }
        return;
      }

      if (data.action === 'deploy') {
        if (!data.success || !data.deployment) {
          setMessages(prev => [...prev, { 
            role: 'assistant', 
            content: data.message || 'Deployment failed. Please ensure your contract is compiled.'
          }]);
          return;
        }

        try {
          // Check MetaMask connection again before deployment
          if (!window.ethereum) {
            throw new Error('MetaMask not detected. Please install MetaMask to deploy contracts.');
          }

          const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
          if (!accounts || accounts.length === 0) {
            throw new Error('Please connect your MetaMask wallet to deploy contracts.');
          }

          const deploymentResult = await deployContract(
            data.deployment.bytecode,
            data.deployment.abi
          );

          setMessages(prev => [...prev, { 
            role: 'assistant', 
            content: `Contract deployed successfully! You can now interact with it at address: ${deploymentResult.address}`
          }]);

          if (onDeploy) {
            await onDeploy(deploymentResult);
          }
        } catch (error: any) {
          setMessages(prev => [...prev, { 
            role: 'assistant', 
            content: `Deployment failed: ${error.message}`
          }]);
        }
        return;
      }

      if (data.contractCode && data.contractName && data.contractId) {
        await queryClient.invalidateQueries({ queryKey: ['/api/contracts'] });

        toast({
          title: "Contract Generated",
          description: `Created new contract: ${data.contractName}`,
        });

        if (onFileSelect) {
          onFileSelect(data.contractCode, data.contractId);
          setMessages(prev => [
            ...prev, 
            { 
              role: 'assistant', 
              content: `${data.message}\n\nI've loaded the contract into the editor for you to review and modify.`
            }
          ]);
        } else {
          setMessages(prev => [...prev, { role: 'assistant', content: data.message }]);
        }
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: data.message }]);
      }
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to process your request';

      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `I encountered an error: ${errorMessage}. Please make sure your wallet is connected and try again.`
      }]);

      toast({
        variant: "destructive",
        title: "Error",
        description: errorMessage
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Button
        className={cn(
          "fixed bottom-4 right-4 p-3 rounded-full shadow-lg",
          isOpen && "hidden"
        )}
        size="icon"
        onClick={() => setIsOpen(true)}
      >
        <Bot className="h-6 w-6" />
      </Button>

      {isOpen && (
        <Card className="fixed bottom-4 right-4 w-[400px] h-[600px] shadow-xl flex flex-col">
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              <h3 className="font-semibold">Smart Contract Assistant</h3>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {!connectedAddress ? (
                <div className="text-center text-muted-foreground">
                  <p className="text-red-500">Please connect your wallet to use the AI assistant</p>
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center text-muted-foreground">
                  <p>👋 Hello! I can help you with:</p>
                  <ul className="text-sm mt-2">
                    <li>• Writing smart contracts</li>
                    <li>• Compiling contracts (just say "compile")</li>
                    <li>• Deploying contracts (just say "deploy")</li>
                    <li>• Best practices</li>
                  </ul>
                  <p className="mt-4 text-sm">
                    Try saying: "Create a token contract" or "Generate an NFT contract"
                  </p>
                </div>
              ) : (
                messages.map((msg, i) => (
                  <div
                    key={i}
                    className={cn(
                      "flex gap-2 max-w-[85%]",
                      msg.role === 'user' ? "ml-auto" : "mr-auto"
                    )}
                  >
                    {msg.role === 'assistant' && (
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Bot className="h-4 w-4" />
                      </div>
                    )}
                    <div
                      className={cn(
                        "rounded-lg p-3",
                        msg.role === 'user'
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      )}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))
              )}
              {isLoading && (
                <div className="flex gap-2 max-w-[85%]">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div className="bg-muted rounded-lg p-3">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          <form onSubmit={handleSubmit} className="p-4 border-t">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={connectedAddress ? "Ask about smart contracts..." : "Connect wallet to chat..."}
                disabled={isLoading || !connectedAddress}
              />
              <Button type="submit" size="icon" disabled={isLoading || !connectedAddress}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </form>
        </Card>
      )}
    </>
  );
}