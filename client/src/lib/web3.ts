import { ethers } from "ethers";

declare global {
  interface Window {
    ethereum?: any;
  }
}

let provider: ethers.BrowserProvider | null = null;
let currentChainId: string | null = null;

// Network configurations
const SUPPORTED_NETWORKS = {
  sepolia: {
    chainId: '0xaa36a7', // 11155111 in hex
    name: 'Sepolia'
  },
  goerli: {
    chainId: '0x5',
    name: 'Goerli'
  }
};

export async function connectWallet() {
  if (!window.ethereum) {
    throw new Error("MetaMask not found! Please install MetaMask extension.");
  }

  try {
    provider = new ethers.BrowserProvider(window.ethereum);
    const accounts = await provider.send("eth_requestAccounts", []);

    // Get current network
    const network = await provider.getNetwork();
    const chainId = await provider.send("eth_chainId", []);
    currentChainId = chainId;
    console.log('Connected to network:', network.name);

    // Setup network change handler
    window.ethereum.on('chainChanged', (newChainId: string) => {
      if (newChainId !== currentChainId) {
        console.log('Network changed from:', currentChainId, 'to:', newChainId);
        currentChainId = newChainId;
        window.location.reload();
      }
    });

    // Setup account change handler
    window.ethereum.on('accountsChanged', (accounts: string[]) => {
      console.log('Account changed:', accounts[0]);
      if (accounts[0]) {
        window.location.reload();
      }
    });

    return accounts[0];
  } catch (error: any) {
    console.error('Wallet connection error:', error);
    if (error.code === 4001) {
      throw new Error("Please connect your MetaMask wallet");
    }
    throw error;
  }
}

export async function getConnectedAccount() {
  if (!window.ethereum) {
    return null;
  }

  try {
    provider = new ethers.BrowserProvider(window.ethereum);
    const accounts = await provider.send("eth_accounts", []);

    if (accounts[0]) {
      const network = await provider.getNetwork();
      console.log('Current network:', network.name);
      const chainId = await provider.send("eth_chainId", []);
      currentChainId = chainId;

      const isSupportedNetwork = Object.values(SUPPORTED_NETWORKS)
        .some(net => net.chainId.toLowerCase() === chainId.toLowerCase());

      if (!isSupportedNetwork) {
        console.warn('Warning: Connected to unsupported network');
      }
    }

    return accounts[0] || null;
  } catch (error) {
    console.error('Error getting connected account:', error);
    return null;
  }
}

export async function deployContract(abi: any[], bytecode: string) {
  if (!provider) {
    throw new Error("Please connect your wallet first");
  }

  try {
    // Get the signer
    const signer = await provider.getSigner();

    // Ensure bytecode is properly formatted
    const formattedBytecode = bytecode.startsWith('0x') ? bytecode : `0x${bytecode}`;

    console.log('Creating contract factory...');
    const factory = new ethers.ContractFactory(abi, formattedBytecode, signer);

    console.log('Deploying contract...');
    const contract = await factory.deploy();

    console.log('Waiting for deployment confirmation...');
    await contract.waitForDeployment();

    const address = await contract.getAddress();
    console.log('Contract deployed at:', address);

    // Verify contract code exists
    const code = await provider.getCode(address);
    if (code === '0x') {
      throw new Error('Contract deployment failed - no code at address');
    }

    return address;
  } catch (error: any) {
    console.error('Deployment error:', error);

    if (error.code === 'INSUFFICIENT_FUNDS') {
      throw new Error('Insufficient funds for contract deployment');
    } else if (error.code === 4001) {
      throw new Error('Transaction rejected. Please confirm the transaction in MetaMask.');
    } else if (error.message?.includes('user rejected transaction')) {
      throw new Error('Transaction was rejected by the user');
    } else if (error.message?.includes('insufficient funds')) {
      throw new Error('Insufficient funds to deploy the contract');
    } else {
      throw new Error(`Contract deployment failed: ${error.message || 'Unknown error'}`);
    }
  }
}

export async function getContract(address: string, abi: any[]) {
  if (!provider) {
    throw new Error("Please connect your wallet first");
  }

  try {
    const signer = await provider.getSigner();
    return new ethers.Contract(address, abi, signer);
  } catch (error: any) {
    console.error('Error getting contract:', error);
    throw new Error(`Failed to get contract instance: ${error.message}`);
  }
}