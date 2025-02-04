import axios from 'axios';

export class EtherscanService {
  private static async getApiKey(): Promise<string> {
    // Try to get the API key from localStorage first
    const storedKey = localStorage.getItem('etherscan_api_key');
    if (storedKey) {
      return storedKey;
    }

    // If no key is stored, prompt the user
    const apiKey = prompt(
      'Please enter your Etherscan API key to verify contracts.\n' +
      'You can get one from https://etherscan.io/apis'
    );

    if (!apiKey) {
      throw new Error('Etherscan API key is required for contract verification');
    }

    // Save the key for future use
    localStorage.setItem('etherscan_api_key', apiKey);
    return apiKey;
  }

  static async verifyContract(
    address: string,
    sourceCode: string,
    contractName: string,
    network: string = 'sepolia'
  ): Promise<string> {
    const apiKey = await this.getApiKey();

    try {
      if (!sourceCode?.trim()) {
        throw new Error('Source code is required for verification');
      }

      if (!address?.trim()) {
        throw new Error('Contract address is required for verification');
      }

      const response = await axios.post(
        `https://api-${network}.etherscan.io/api`,
        null,
        {
          params: {
            module: 'contract',
            action: 'verifysourcecode',
            apikey: apiKey,
            contractaddress: address,
            sourceCode,
            contractname: contractName,
            compilerversion: 'v0.8.20', // We should get this from the contract metadata
            optimizationUsed: 1,
            runs: 200,
            evmversion: 'london'
          },
        }
      );

      if (response.data.status === '0') {
        throw new Error(response.data.result);
      }

      return response.data.result; // This is the GUID for checking verification status
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 403 || error.response?.status === 401) {
          // Clear invalid API key
          localStorage.removeItem('etherscan_api_key');
          throw new Error('Invalid Etherscan API key. Please try again with a valid key.');
        }
        throw new Error(
          error.response?.data?.result || 'Failed to verify contract on Etherscan'
        );
      }
      throw error;
    }
  }

  static async checkVerificationStatus(
    guid: string,
    network: string = 'sepolia'
  ): Promise<{
    status: 'pending' | 'success' | 'failed';
    message?: string;
  }> {
    const apiKey = await this.getApiKey();

    try {
      const response = await axios.get(
        `https://api-${network}.etherscan.io/api`,
        {
          params: {
            module: 'contract',
            action: 'checkverifystatus',
            guid,
            apikey: apiKey,
          },
        }
      );

      if (response.data.status === '1') {
        return { status: 'success' };
      } else if (response.data.result === 'Pending in queue') {
        return { status: 'pending' };
      } else {
        return { 
          status: 'failed',
          message: response.data.result 
        };
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 403 || error.response?.status === 401) {
          localStorage.removeItem('etherscan_api_key');
          throw new Error('Invalid Etherscan API key');
        }
        throw new Error(error.response?.data?.result || 'Failed to check verification status');
      }
      throw new Error('Failed to check verification status');
    }
  }
}