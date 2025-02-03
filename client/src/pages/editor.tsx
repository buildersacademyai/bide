import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { connectWallet, getConnectedAccount } from '@/lib/web3';
import { ContractEditor } from '@/components/ContractEditor';
import { FileExplorer } from '@/components/FileExplorer';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Loader2, Code2, Rocket, Terminal } from 'lucide-react';
import { CompilationResults } from '@/components/CompilationResults';
import { DeployedContracts } from '@/components/DeployedContracts';
import { ContractCompiler } from '@/components/ContractCompiler';

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
  const [currentContractId, setCurrentContractId] = useState<number | undefined>();
  const [compiledContract, setCompiledContract] = useState<{
    abi: any[];
    bytecode: string;
  } | null>(null);

  const { data: account, isLoading: isWalletLoading } = useQuery({ 
    queryKey: ['wallet'],
    queryFn: getConnectedAccount,
    refetchOnWindowFocus: true
  });

  const handleFileSelect = (content: string, contractId: number) => {
    setSourceCode(content);
    setCurrentContractId(contractId);
    // Reset compilation results when switching files
    setCompiledContract(null);
  };

  const handleCompileSuccess = (abi: any[], bytecode: string) => {
    setCompiledContract({ abi, bytecode });
    // Invalidate queries to refresh the UI with new compilation results
    queryClient.invalidateQueries({ queryKey: ['/api/contracts'] });
  };

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
    <div className="flex h-[calc(100vh-4rem)]">
      <FileExplorer onFileSelect={handleFileSelect} />

      <div className="flex-1 p-4 space-y-8 overflow-y-auto">
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

          <TabsContent value="editor" className="mt-6 space-y-4">
            <Card className="p-6">
              <ContractEditor 
                value={sourceCode} 
                onChange={setSourceCode}
                contractId={currentContractId}
              />
            </Card>
            <ContractCompiler 
              sourceCode={sourceCode} 
              onCompileSuccess={handleCompileSuccess}
            />
          </TabsContent>

          <TabsContent value="compile" className="mt-6">
            <Card className="p-6">
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold mb-4">Compilation Results</h2>
                  <CompilationResults />
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="deploy" className="mt-6">
            <Card className="p-6">
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold mb-4">Deploy Contract</h2>
                  <p className="text-muted-foreground mb-4">
                    Deploy your compiled smart contract to Ethereum testnet.
                  </p>
                  <Button 
                    className="w-full gap-2" 
                    disabled={!compiledContract || !account}
                  >
                    <Rocket className="w-4 h-4" />
                    Deploy Contract
                  </Button>
                </div>

                <div className="mt-8">
                  <h3 className="text-lg font-semibold mb-4">Deployed Contracts</h3>
                  <DeployedContracts />
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}