import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { connectWallet, getConnectedAccount } from '@/lib/web3';
import { ContractEditor } from '@/components/ContractEditor';
import { ContractCompiler } from '@/components/ContractCompiler';
import { ContractDeployer } from '@/components/ContractDeployer';
import { ContractInteraction } from '@/components/ContractInteraction';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Copy, CheckCircle2 } from 'lucide-react';

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
  const [abi, setAbi] = useState<any[]>([]);
  const [bytecode, setBytecode] = useState('');
  const [contractAddress, setContractAddress] = useState('');
  const [copiedStates, setCopiedStates] = useState<Record<string, boolean>>({});

  const { data: contracts } = useQuery<any>({ 
    queryKey: ['/api/contracts']
  });

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

  const handleCompileSuccess = (abi: any[], bytecode: string) => {
    setAbi(abi);
    setBytecode(bytecode);
    toast({
      title: "Compilation successful",
      description: "Contract compiled successfully",
    });
  };

  const handleDeploySuccess = (address: string) => {
    setContractAddress(address);
    toast({
      title: "Deployment successful",
      description: `Contract deployed at ${address}`,
    });
  };

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedStates(prev => ({ ...prev, [id]: true }));
    setTimeout(() => {
      setCopiedStates(prev => ({ ...prev, [id]: false }));
    }, 2000);
  };

  return (
    <div className="container mx-auto p-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Smart Contract Editor</h1>
        <p className="text-muted-foreground mt-2">
          Write, compile, and deploy your smart contracts
        </p>
      </div>

      {!isWalletLoading && !account && (
        <div className="mb-8 p-4 border rounded-lg bg-muted">
          <p className="mb-4">Connect your wallet to start deploying contracts</p>
          <Button onClick={handleConnect}>
            Connect Wallet
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <ContractEditor value={sourceCode} onChange={setSourceCode} />
          <div className="mt-4">
            <ContractCompiler
              sourceCode={sourceCode}
              onCompileSuccess={handleCompileSuccess}
            />
          </div>
          {abi.length > 0 && (
            <div className="mt-4">
              <ContractDeployer
                abi={abi}
                bytecode={bytecode}
                onDeploySuccess={handleDeploySuccess}
              />
            </div>
          )}
        </div>

        <div>
          {contractAddress && (
            <ContractInteraction address={contractAddress} abi={abi} />
          )}

          {contracts?.length > 0 && (
            <div className="mt-8">
              <h2 className="text-xl font-bold mb-4">Deployed Contracts</h2>
              {contracts.map((contract: any) => (
                <div 
                  key={contract.id}
                  className="p-4 border rounded-lg mb-4"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="font-medium">{contract.name || 'Unnamed Contract'}</p>
                      <p className="text-sm text-muted-foreground truncate">{contract.address || 'Not deployed'}</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setAbi(contract.abi);
                        setContractAddress(contract.address);
                      }}
                    >
                      Interact
                    </Button>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="flex gap-2"
                      onClick={() => copyToClipboard(JSON.stringify(contract.abi), `abi-${contract.id}`)}
                    >
                      {copiedStates[`abi-${contract.id}`] ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                      Copy ABI
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="flex gap-2"
                      onClick={() => copyToClipboard(contract.bytecode, `bytecode-${contract.id}`)}
                    >
                      {copiedStates[`bytecode-${contract.id}`] ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                      Copy Bytecode
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}