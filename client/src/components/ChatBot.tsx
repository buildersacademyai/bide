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

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatResponse {
  message: string;
  contractCode?: string;
  contractName?: string;
}

export function ChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [connectedAddress, setConnectedAddress] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    const checkWallet = async () => {
      const account = await getConnectedAccount();
      setConnectedAddress(account);
    };
    checkWallet();
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    if (!connectedAddress) {
      toast({
        variant: "destructive",
        title: "Wallet not connected",
        description: "Please connect your wallet to use the AI assistant",
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
          'x-wallet-address': connectedAddress
        },
        body: JSON.stringify({ message: userMessage }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data: ChatResponse = await response.json();

      // Handle contract generation response
      if (data.contractCode && data.contractName) {
        // Invalidate contracts query to refresh file explorer
        await queryClient.invalidateQueries({ queryKey: ['/api/contracts'] });

        toast({
          title: "Contract Generated",
          description: `Created new contract: ${data.contractName}`,
        });
      }

      setMessages(prev => [...prev, { role: 'assistant', content: data.message }]);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Sorry, I encountered an error. Please make sure your wallet is connected and try again.' 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Bot Icon */}
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

      {/* Chat Interface */}
      {isOpen && (
        <Card className="fixed bottom-4 right-4 w-[400px] h-[600px] shadow-xl flex flex-col">
          {/* Header */}
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

          {/* Messages */}
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
                    <li>• Explaining contract code</li>
                    <li>• Deployment assistance</li>
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

          {/* Input */}
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