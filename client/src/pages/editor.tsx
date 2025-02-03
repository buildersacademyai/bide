import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { connectWallet, getConnectedAccount } from '@/lib/web3';
import { ContractEditor } from '@/components/ContractEditor';
import { FileExplorer } from '@/components/FileExplorer';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Code2, Rocket } from 'lucide-react';

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

  const handleCompile = () => {
    toast({
      title: "Coming Soon",
      description: "Contract compilation will be implemented next",
    });
  };

  const handleDeploy = () => {
    toast({
      title: "Coming Soon",
      description: "Contract deployment will be implemented next",
    });
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <FileExplorer onFileSelect={setSourceCode} />

      <div className="flex-1 flex flex-col h-full">
        <div className="flex justify-between items-center px-6 py-4 border-b">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Smart Contract IDE
            </h1>
          </div>

          {!isWalletLoading && !account ? (
            <Button onClick={handleConnect} className="gap-2">
              Connect Wallet
            </Button>
          ) : (
            <div className="text-sm text-muted-foreground">
              Connected: {account?.slice(0, 6)}...{account?.slice(-4)}
            </div>
          )}
        </div>

        <div className="flex-1 p-6 flex flex-col space-y-4">
          <div className="flex-1">
            <ContractEditor 
              value={sourceCode} 
              onChange={setSourceCode} 
            />
          </div>

          <div className="flex gap-4">
            <Button 
              className="flex-1 gap-2" 
              onClick={handleCompile}
            >
              <Code2 className="w-4 h-4" />
              Compile
            </Button>
            <Button 
              className="flex-1 gap-2"
              onClick={handleDeploy}
              variant="secondary"
            >
              <Rocket className="w-4 h-4" />
              Deploy
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}