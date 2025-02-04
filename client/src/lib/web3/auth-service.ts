import { ethers } from 'ethers';

declare global {
  interface Window {
    ethereum: {
      isMetaMask?: boolean;
      request: (args: { method: string; params?: any[] }) => Promise<any>;
      on: (event: string, handler: (...args: any[]) => void) => void;
      removeListener: (event: string, handler: (...args: any[]) => void) => void;
    } | undefined;
  }
}

export class Web3AuthService {
  private static provider: ethers.BrowserProvider | null = null;
  private static address: string | null = null;
  private static chainId: string | null = null;
  private static isConnecting: boolean = false;

  static async connect(): Promise<string> {
    try {
      if (this.isConnecting) return this.address || '';
      this.isConnecting = true;

      // Check if MetaMask is installed
      if (!window.ethereum) {
        throw new Error('MetaMask is not installed');
      }

      // Request account access
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });

      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts found');
      }

      // Create Web3 provider
      this.provider = new ethers.BrowserProvider(window.ethereum);
      this.address = accounts[0];

      // Get current chain ID
      const network = await this.provider.getNetwork();
      this.chainId = network.chainId.toString();

      // Store address and chain ID in localStorage
      localStorage.setItem('wallet_address', this.address);
      localStorage.setItem('chain_id', this.chainId);

      // Remove previous listeners before adding new ones
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', this.handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', this.handleChainChanged);

        // Add new listeners
        window.ethereum.on('accountsChanged', this.handleAccountsChanged);
        window.ethereum.on('chainChanged', this.handleChainChanged);
      }

      return this.address;
    } catch (error) {
      console.error('Failed to connect to MetaMask:', error);
      throw new Error('Failed to connect to MetaMask. Please make sure it is installed and unlocked.');
    } finally {
      this.isConnecting = false;
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
    const address = localStorage.getItem('wallet_address');
    if (!address) return null;

    // Verify the address is still accessible in MetaMask
    try {
      if (window.ethereum) {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts && accounts[0]?.toLowerCase() === address.toLowerCase()) {
          return address;
        }
      }
      // If we can't verify the address, clear it
      localStorage.removeItem('wallet_address');
      return null;
    } catch (error) {
      console.error('Error verifying wallet connection:', error);
      return null;
    }
  }

  static async getCurrentChainId(): Promise<string | null> {
    return localStorage.getItem('chain_id');
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
        localStorage.removeItem('wallet_address');
        localStorage.removeItem('chain_id');
        this.address = null;
        this.chainId = null;
        window.dispatchEvent(new CustomEvent('walletDisconnected'));
      } else if (accounts[0] !== this.address) {
        // User switched accounts
        this.address = accounts[0];
        localStorage.setItem('wallet_address', accounts[0]);
        window.dispatchEvent(new CustomEvent('accountChanged', {
          detail: { address: accounts[0] }
        }));
      }
    } catch (error) {
      console.error('Error handling account change:', error);
    }
  };

  private static handleChainChanged = async (chainId: string) => {
    try {
      const hexChainId = chainId.toLowerCase();
      if (this.chainId !== hexChainId) {
        this.chainId = hexChainId;
        localStorage.setItem('chain_id', hexChainId);

        if (window.ethereum && this.address) {
          this.provider = new ethers.BrowserProvider(window.ethereum);
          window.dispatchEvent(new CustomEvent('networkChanged', {
            detail: { chainId: hexChainId }
          }));
        }
      }
    } catch (error) {
      console.error('Error handling chain change:', error);
    }
  };
}