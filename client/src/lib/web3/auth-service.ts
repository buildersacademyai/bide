import { ethers } from 'ethers';

export class Web3AuthService {
  private static provider: ethers.BrowserProvider | null = null;
  private static address: string | null = null;
  private static chainId: string | null = null;

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

      // Get current chain ID
      const network = await this.provider.getNetwork();
      this.chainId = network.chainId.toString();

      // Store address and chain ID in localStorage
      localStorage.setItem('wallet_address', this.address);
      localStorage.setItem('chain_id', this.chainId);

      // Listen for account and network changes
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
    this.chainId = null;
    localStorage.removeItem('wallet_address');
    localStorage.removeItem('chain_id');
  }

  static async getCurrentAddress(): Promise<string | null> {
    return localStorage.getItem('wallet_address');
  }

  static async signMessage(message: string): Promise<string> {
    if (!this.provider) {
      throw new Error('Not connected to MetaMask');
    }
    const signer = await this.provider.getSigner();
    return await signer.signMessage(message);
  }

  private static handleAccountsChanged = async (accounts: string[]) => {
    try {
      if (accounts.length === 0) {
        // MetaMask is locked or the user has not connected any accounts
        await this.disconnect();
      } else if (accounts[0] !== this.address) {
        // User switched accounts
        this.address = accounts[0];
        localStorage.setItem('wallet_address', accounts[0]);
        window.location.reload();
      }
    } catch (error) {
      console.error('Error handling account change:', error);
    }
  };

  private static handleChainChanged = async (chainId: string) => {
    try {
      // Update stored chain ID
      this.chainId = chainId;
      localStorage.setItem('chain_id', chainId);

      // Get new provider for the new network
      if (window.ethereum) {
        this.provider = new ethers.BrowserProvider(window.ethereum);
        // Verify the address is still valid on the new network
        const signer = await this.provider.getSigner();
        const address = await signer.getAddress();
        if (address !== this.address) {
          this.address = address;
          localStorage.setItem('wallet_address', address);
        }
      }
    } catch (error) {
      console.error('Error handling network change:', error);
      await this.disconnect();
    }
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