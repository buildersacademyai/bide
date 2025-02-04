import { ethers } from 'ethers';

export class Web3AuthService {
  private static provider: ethers.BrowserProvider | null = null;
  private static address: string | null = null;

  static async connect(): Promise<string> {
    try {
      // Check if MetaMask is installed
      if (!window.ethereum) {
        throw new Error('MetaMask is not installed');
      }

      // Request account access
      await window.ethereum.request({ method: 'eth_requestAccounts' });

      // Create Web3 provider
      this.provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await this.provider.getSigner();
      this.address = await signer.getAddress();

      // Store address in localStorage
      localStorage.setItem('wallet_address', this.address);

      // Listen for account changes
      window.ethereum.on('accountsChanged', this.handleAccountsChanged);
      window.ethereum.on('chainChanged', this.handleChainChanged);

      return this.address;
    } catch (error) {
      console.error('Failed to connect to MetaMask:', error);
      throw new Error('Failed to connect to MetaMask. Please make sure it is installed and unlocked.');
    }
  }

  static async disconnect(): Promise<void> {
    if (window.ethereum) {
      window.ethereum.removeListener('accountsChanged', this.handleAccountsChanged);
      window.ethereum.removeListener('chainChanged', this.handleChainChanged);
    }
    this.provider = null;
    this.address = null;
    localStorage.removeItem('wallet_address');
  }

  static async getCurrentAddress(): Promise<string | null> {
    if (!this.provider || !this.address) {
      return localStorage.getItem('wallet_address');
    }
    return this.address;
  }

  static async signMessage(message: string): Promise<string> {
    if (!this.provider) {
      throw new Error('Not connected to MetaMask');
    }
    const signer = await this.provider.getSigner();
    return await signer.signMessage(message);
  }

  private static handleAccountsChanged = (accounts: string[]) => {
    if (accounts.length === 0) {
      // MetaMask is locked or the user has not connected any accounts
      this.provider = null;
      this.address = null;
      localStorage.removeItem('wallet_address');
      window.location.reload();
    } else if (accounts[0] !== this.address) {
      // User switched accounts
      this.address = accounts[0];
      localStorage.setItem('wallet_address', accounts[0]);
      window.location.reload();
    }
  };

  private static handleChainChanged = () => {
    // Reload the page when the chain changes
    window.location.reload();
  };
}

// Add type declarations for window.ethereum
declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: any[] }) => Promise<any>;
      on: (event: string, handler: (...args: any[]) => void) => void;
      removeListener: (event: string, handler: (...args: any[]) => void) => void;
    };
  }
}