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
    return localStorage.getItem('wallet_address');
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
        await this.disconnect();
      } else if (accounts[0] !== this.address) {
        // User switched accounts
        this.address = accounts[0];
        localStorage.setItem('wallet_address', accounts[0]);

        // Dispatch an event that components can listen to
        window.dispatchEvent(new CustomEvent('accountChanged', {
          detail: { address: accounts[0] }
        }));
      }
    } catch (error) {
      console.error('Error handling account change:', error);
    }
  };

  private static handleChainChanged = async (newChainId: string) => {
    try {
      const hexChainId = newChainId.toLowerCase();
      if (this.chainId?.toLowerCase() !== hexChainId) {
        // Update stored chain ID
        this.chainId = hexChainId;
        localStorage.setItem('chain_id', hexChainId);

        // Only update provider if we're still connected
        if (window.ethereum && this.address) {
          this.provider = new ethers.BrowserProvider(window.ethereum);

          // Dispatch a custom event that components can listen to
          window.dispatchEvent(new CustomEvent('networkChanged', {
            detail: { chainId: hexChainId }
          }));
        }
      }
    } catch (error: unknown) {
      console.error('Error handling network change:', error);
      // Only disconnect if there's an actual error, not just a network change
      if (error instanceof Error && !error.message.includes('underlying network changed')) {
        await this.disconnect();
      }
    }
  };
}