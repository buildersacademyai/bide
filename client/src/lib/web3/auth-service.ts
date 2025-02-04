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
  private static networkChangeTimeout: NodeJS.Timeout | null = null;

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
      if (this.address) {
        localStorage.setItem('wallet_address', this.address);
      }
      if (this.chainId) {
        localStorage.setItem('chain_id', this.chainId);
      }

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
    localStorage.removeItem('token');
  }

  static async getCurrentAddress(): Promise<string | null> {
    try {
      const address = localStorage.getItem('wallet_address');
      if (!address || !window.ethereum) return null;

      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      if (!accounts || accounts.length === 0 || accounts[0]?.toLowerCase() !== address.toLowerCase()) {
        localStorage.removeItem('wallet_address');
        localStorage.removeItem('token');
        return null;
      }

      return address;
    } catch (error) {
      console.error('Error verifying wallet connection:', error);
      return null;
    }
  }

  static async getCurrentChainId(): Promise<string | null> {
    return localStorage.getItem('chain_id');
  }

  private static handleAccountsChanged = async (accounts: string[]) => {
    try {
      if (accounts.length === 0) {
        // MetaMask is locked or the user has not connected any accounts
        localStorage.removeItem('wallet_address');
        localStorage.removeItem('chain_id');
        localStorage.removeItem('token');
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
      // Clear previous timeout if it exists
      if (this.networkChangeTimeout) {
        clearTimeout(this.networkChangeTimeout);
      }

      // Debounce network change events
      this.networkChangeTimeout = setTimeout(async () => {
        const hexChainId = chainId.toLowerCase();
        if (this.chainId !== hexChainId) {
          this.chainId = hexChainId;
          localStorage.setItem('chain_id', hexChainId);

          if (window.ethereum && this.address) {
            this.provider = new ethers.BrowserProvider(window.ethereum);

            // Dispatch network change event after a small delay
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent('networkChanged', {
                detail: { chainId: hexChainId }
              }));
            }, 500);
          }
        }
      }, 1000); // Debounce for 1 second
    } catch (error) {
      console.error('Error handling chain change:', error);
    }
  };
}