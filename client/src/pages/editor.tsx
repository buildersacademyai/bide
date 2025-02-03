import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { connectWallet, getConnectedAccount } from '@/lib/web3';
import { ContractEditor } from '@/components/ContractEditor';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Loader2, Code2, Rocket, Terminal } from 'lucide-react';

const DEFAULT_CONTRACT = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract SimpleStorage {
    uint256 private value;

    function setValue(uint256 _value) public {
        value = _value;
    }

    function getValue() public view returns (uint256) {
        return value;
    }
}`;

export default function Editor() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [sourceCode, setSourceCode] = useState(DEFAULT_CONTRACT);

  const { data: account, isLoading: isWalletLoading } = useQuery({ 
    queryKey: ['wallet'],
    queryFn: getConnectedAccount,
    refetchOnWindowFocus: true
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
    <div className="container mx-auto p-4 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Smart Contract IDE
          </h1>
          <p className="text-muted-foreground mt-2">
            Write, compile, and deploy your smart contracts
          </p>
        </div>

        {!isWalletLoading && !account ? (
          <Button onClick={handleConnect} className="gap-2">
            <Terminal className="w-4 h-4" />
            Connect Wallet
          </Button>
        ) : (
          <div className="text-sm text-muted-foreground">
            Connected: {account?.slice(0, 6)}...{account?.slice(-4)}
          </div>
        )}
      </div>

      <Tabs defaultValue="editor" className="w-full">
        <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
          <TabsTrigger value="editor" className="gap-2">
            <Code2 className="w-4 h-4" />
            Editor
          </TabsTrigger>
          <TabsTrigger value="compile" className="gap-2">
            <Terminal className="w-4 h-4" />
            Compile
          </TabsTrigger>
          <TabsTrigger value="deploy" className="gap-2">
            <Rocket className="w-4 h-4" />
            Deploy
          </TabsTrigger>
        </TabsList>

        <TabsContent value="editor" className="mt-6">
          <Card className="p-6">
            <ContractEditor 
              value={sourceCode} 
              onChange={setSourceCode} 
            />
          </Card>
        </TabsContent>

        <TabsContent value="compile" className="mt-6">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Compile Contract</h2>
            <p className="text-muted-foreground mb-4">
              Compile your Solidity smart contract to generate ABI and bytecode.
            </p>
            <Button disabled className="w-full gap-2">
              <Terminal className="w-4 h-4" />
              Coming Soon
            </Button>
          </Card>
        </TabsContent>

        <TabsContent value="deploy" className="mt-6">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Deploy Contract</h2>
            <p className="text-muted-foreground mb-4">
              Deploy your compiled smart contract to Ethereum testnet.
            </p>
            <Button disabled className="w-full gap-2">
              <Rocket className="w-4 h-4" />
              Coming Soon
            </Button>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}