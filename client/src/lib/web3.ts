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

    // Setup network change handler with debounce
    let networkChangeTimeout: NodeJS.Timeout;
    window.ethereum.on('chainChanged', (newChainId: string) => {
      // Clear any pending timeout
      if (networkChangeTimeout) {
        clearTimeout(networkChangeTimeout);
      }

      // Only reload if the chain actually changed
      if (newChainId !== currentChainId) {
        console.log('Network changed from:', currentChainId, 'to:', newChainId);
        currentChainId = newChainId;

        // Debounce the reload
        networkChangeTimeout = setTimeout(() => {
          window.location.reload();
        }, 1000); // Wait 1 second before reloading
      }
    });

    // Setup account change handler
    window.ethereum.on('accountsChanged', (accounts: string[]) => {
      console.log('Account changed:', accounts[0]);
      // Only reload if we actually have a new account
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
      // Verify we're on a supported network
      const network = await provider.getNetwork();
      console.log('Current network:', network.name);

      const chainId = await provider.send("eth_chainId", []);
      currentChainId = chainId;
      console.log('Chain ID:', chainId);

      // Verify if the network is supported
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

  if (!abi || !bytecode) {
    throw new Error("Contract ABI and bytecode are required");
  }

  try {
    // Get the signer
    const signer = await provider.getSigner();

    // Create contract factory
    const factory = new ethers.ContractFactory(abi, bytecode, signer);

    // Deploy contract
    const contract = await factory.deploy();

    // Wait for deployment with timeout and retry
    const maxRetries = 3;
    let currentRetry = 0;

    while (currentRetry < maxRetries) {
      try {
        const deployed = await contract.waitForDeployment();
        const address = await contract.getAddress();

        // Verify the deployment
        const code = await provider.getCode(address);
        if (code === '0x') {
          throw new Error('Contract deployment failed - no code at address');
        }

        return address;
      } catch (retryError) {
        currentRetry++;
        if (currentRetry === maxRetries) {
          throw retryError;
        }
        // Wait before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, currentRetry)));
      }
    }
  } catch (error: any) {
    console.error('Deployment error:', error);

    if (error.code === 'INSUFFICIENT_FUNDS') {
      throw new Error('Insufficient funds for contract deployment');
    } else if (error.code === 4001) {
      throw new Error('Transaction rejected. Please confirm the transaction in MetaMask.');
    } else if (error.message?.includes('timeout')) {
      throw new Error('Deployment timed out. Please try again.');
    } else if (error.message?.includes('Failed to fetch')) {
      throw new Error('Network connection error. Please check your internet connection and try again.');
    } else {
      throw new Error(`Failed to deploy contract: ${error.message || 'Unknown error'}`);
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