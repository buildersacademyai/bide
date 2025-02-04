import { ethers } from "ethers";

declare global {
  interface Window {
    ethereum?: any;
  }
}

let provider: ethers.BrowserProvider | null = null;

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

export async function connectWallet() {
  if (!window.ethereum) {
    throw new Error("MetaMask not found! Please install MetaMask extension.");
  }

  try {
    provider = new ethers.BrowserProvider(window.ethereum);
    const accounts = await provider.send("eth_requestAccounts", []);
    return accounts[0];
  } catch (error: any) {
    console.error('Wallet connection error:', error);
    throw error;
  }
}

export async function deployContract(abi: any[], bytecode: string) {
  if (!provider) {
    throw new Error("Please connect your wallet first");
  }

  try {
    const signer = await provider.getSigner();

    // Create contract factory
    const factory = new ethers.ContractFactory(abi, bytecode, signer);

    // Deploy contract
    const contract = await factory.deploy();
    console.log('Waiting for deployment...');

    // Wait for deployment to complete
    await contract.waitForDeployment();

    // Get the deployed contract address
    const address = await contract.getAddress();
    console.log('Contract deployed at:', address);

    return address;
  } catch (error: any) {
    console.error('Deployment error:', error);
    throw new Error(error.message || 'Contract deployment failed');
  }
}