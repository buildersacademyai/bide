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

  provider = new ethers.BrowserProvider(window.ethereum);
  const accounts = await provider.send("eth_requestAccounts", []);
  return accounts[0];
}

export async function getConnectedAccount() {
  if (!provider) return null;
  const accounts = await provider.send("eth_accounts", []);
  return accounts[0] || null;
}

export async function deployContract(abi: any[], bytecode: string, args: any[] = []) {
  if (!provider) throw new Error("Not connected to wallet");

  const signer = await provider.getSigner();
  const factory = new ethers.ContractFactory(abi, bytecode, signer);
  const contract = await factory.deploy(...args);
  await contract.waitForDeployment();

  return contract.target as string;
}

export async function getContract(address: string, abi: any[]) {
  if (!provider) throw new Error("Not connected to wallet");

  const signer = await provider.getSigner();
  return new ethers.Contract(address, abi, signer);
}