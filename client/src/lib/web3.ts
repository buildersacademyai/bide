import { ethers } from "ethers";

declare global {
  interface Window {
    ethereum?: any;
  }
}

let provider: ethers.BrowserProvider | null = null;

export async function connectWallet() {
  if (!window.ethereum) {
    throw new Error("MetaMask not found! Please install MetaMask extension.");
  }

  try {
    provider = new ethers.BrowserProvider(window.ethereum);
    const accounts = await provider.send("eth_requestAccounts", []);

    // Setup network change handler
    window.ethereum.on('chainChanged', () => {
      // Reload the page on network change as recommended by MetaMask
      window.location.reload();
    });

    return accounts[0];
  } catch (error: any) {
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

    // Deploy with better error handling
    const contract = await factory.deploy();

    // Wait for deployment with timeout
    const deploymentTimeout = 120000; // 2 minutes
    const deployed = await Promise.race([
      contract.waitForDeployment(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Deployment timed out')), deploymentTimeout)
      )
    ]);

    const address = await contract.getAddress();

    // Verify the deployment
    const code = await provider.getCode(address);
    if (code === '0x') {
      throw new Error('Contract deployment failed - no code at address');
    }

    return address;
  } catch (error: any) {
    console.error('Deployment error:', error);

    if (error.code === 'INSUFFICIENT_FUNDS') {
      throw new Error('Insufficient funds for contract deployment. Please make sure you have enough ETH in your wallet.');
    } else if (error.code === 4001) {
      throw new Error('Transaction rejected. Please confirm the transaction in MetaMask.');
    } else if (error.message?.includes('timeout')) {
      throw new Error('Deployment timed out. Please try again.');
    } else if (error.message?.includes('gas')) {
      throw new Error('Gas estimation failed. The contract might be too complex or there might be an error in the code.');
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
    throw new Error(`Failed to get contract instance: ${error.message}`);
  }
}