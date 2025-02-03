import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { connectWallet, getConnectedAccount, deployContract } from '@/lib/web3';
import { ContractEditor } from '@/components/ContractEditor';
import { FileExplorer } from '@/components/FileExplorer';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Loader2, Code2, Rocket, Terminal, History, Pencil } from 'lucide-react';
import { CompilationResults } from '@/components/CompilationResults';
import { DeployedContracts } from '@/components/DeployedContracts';
import { ContractCompiler } from '@/components/ContractCompiler';
import { ContractDeployer } from '@/components/ContractDeployer';
import { UserProfile } from '@/components/UserProfile';
import { TransactionHistory } from '@/components/TransactionHistory';
import { ContractInteraction } from '@/components/ContractInteraction';

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
    address?: string;
  } | null>(null);
  const [isDeploying, setIsDeploying] = useState(false);

  const { data: account, isLoading: isWalletLoading } = useQuery({ 
    queryKey: ['wallet'],
    queryFn: getConnectedAccount,
    refetchOnWindowFocus: true
  });

  const handleFileSelect = async (content: string, contractId: number) => {
    setSourceCode(content);
    setCurrentContractId(contractId);

    // Check if contract is already compiled
    try {
      const response = await fetch(`/api/contracts/${contractId}`);
      const contract = await response.json();

      if (contract.abi && contract.bytecode) {
        setCompiledContract({
          abi: contract.abi,
          bytecode: contract.bytecode,
          address: contract.address
        });
      } else {
        setCompiledContract(null);
      }
    } catch (error) {
      console.error('Error fetching contract:', error);
      setCompiledContract(null);
    }
  };

  const handleCompileSuccess = (abi: any[], bytecode: string) => {
    setCompiledContract({ abi, bytecode });
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

  const handleDeploy = async () => {
    if (!compiledContract || !currentContractId || !account) return;

    setIsDeploying(true);
    try {
      toast({
        title: "Deploying contract",
        description: "Please confirm the transaction in MetaMask...",
      });

      const address = await deployContract(compiledContract.abi, compiledContract.bytecode);

      // Update contract in database with deployment info
      const response = await fetch(`/api/contracts/${currentContractId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address,
          network: 'sepolia',
          abi: compiledContract.abi,
          bytecode: compiledContract.bytecode,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update contract deployment info');
      }

      // Refresh contracts list
      await queryClient.invalidateQueries({ queryKey: ['/api/contracts'] });

      toast({
        title: "Contract deployed",
        description: `Successfully deployed to ${address}`,
      });
      setCompiledContract({...compiledContract, address})
    } catch (err) {
      console.error('Deployment error:', err);
      toast({
        variant: "destructive",
        title: "Deployment failed",
        description: err instanceof Error ? err.message : "Failed to deploy contract",
      });
    } finally {
      setIsDeploying(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <div className="flex flex-1">
        <FileExplorer onFileSelect={handleFileSelect} />

        <div className="flex-1 p-4 space-y-5 overflow-y-auto">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                Smart Contract IDE
              </h1>
              <p className="text-muted-foreground mt-1">
                Write, compile, and deploy your smart contracts
              </p>
            </div>

            {!isWalletLoading ? (
              !account ? (
                <Button onClick={handleConnect} className="gap-2">
                  <Terminal className="w-4 h-4" />
                  Connect Wallet
                </Button>
              ) : (
                <UserProfile address={account} />
              )
            ) : (
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            )}
          </div>

          <Tabs defaultValue="editor" className="w-full">
            <TabsList className="grid w-full grid-cols-5 lg:w-[600px]">
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
              <TabsTrigger value="transactions" className="gap-2">
                <History className="w-4 h-4" />
                Transactions
              </TabsTrigger>
              <TabsTrigger value="interact" className="gap-2">
                <Pencil className="w-4 h-4" />
                Interact
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
              <div className="flex gap-4">
                <ContractCompiler 
                  sourceCode={sourceCode}
                  contractId={currentContractId}
                  onCompileSuccess={handleCompileSuccess}
                />
                {compiledContract && account && (
                  <ContractDeployer
                    contractId={currentContractId!}
                    abi={compiledContract.abi}
                    bytecode={compiledContract.bytecode}
                  />
                )}
              </div>
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
                  {compiledContract && currentContractId ? (
                    <ContractDeployer
                      contractId={currentContractId}
                      abi={compiledContract.abi}
                      bytecode={compiledContract.bytecode}
                    />
                  ) : (
                    <div className="text-center p-6 text-muted-foreground">
                      Compile a contract first to enable deployment
                    </div>
                  )}

                  <div className="mt-8">
                    <h3 className="text-lg font-semibold mb-4">Deployed Contracts</h3>
                    <DeployedContracts />
                  </div>
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="transactions" className="mt-6">
              <Card className="p-6">
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-semibold mb-4">Transaction History</h2>
                    <TransactionHistory address={account} />
                  </div>
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="interact" className="mt-6">
              <Card className="p-6">
                <div className="space-y-6">
                  {compiledContract && currentContractId ? (
                    <ContractInteraction
                      address={compiledContract.address}
                      abi={compiledContract.abi}
                    />
                  ) : (
                    <div className="text-center p-6 text-muted-foreground">
                      Deploy a contract first to enable interaction
                    </div>
                  )}
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}