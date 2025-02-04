import axios from 'axios';

export class EtherscanService {
  private static async getApiKey(): Promise<string> {
    // Try to get the API key from localStorage first
    const storedKey = localStorage.getItem('etherscan_api_key');
    if (storedKey) {
      return storedKey;
    }

    // If no key is stored, throw an error to trigger the API key dialog
    throw new Error('NO_API_KEY');
  }

  static async verifyContract(
    address: string,
    sourceCode: string,
    contractName: string,
    network: string = 'sepolia'
  ): Promise<string> {
    try {
      const apiKey = await this.getApiKey();

      if (!sourceCode?.trim()) {
        throw new Error('Source code is required for verification');
      }

      if (!address?.trim()) {
        throw new Error('Contract address is required for verification');
      }

      // Extract actual contract name from the file name (remove .sol if present)
      const actualContractName = contractName.replace('.sol', '');

      // Verify the contract name exists in the source code
      const contractMatch = sourceCode.match(/contract\s+(\w+)/);
      if (!contractMatch || contractMatch[1] !== actualContractName) {
        throw new Error(`Contract name '${actualContractName}' not found in source code`);
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
            contractname: actualContractName,
            codeformat: 'solidity-single-file',
            compilerversion: 'v0.8.20+commit.a1b79de6', // Making this more specific
            optimizationUsed: 1,
            runs: 200,
            evmversion: 'london',
            licenseType: 1 // MIT License
          },
        }
      );

      if (response.data.status === '0') {
        throw new Error(response.data.result);
      }

      return response.data.result; // This is the GUID for checking verification status
    } catch (error) {
      if (error.message === 'NO_API_KEY') {
        throw error;
      }

      if (axios.isAxiosError(error)) {
        if (error.response?.status === 403 || error.response?.status === 401) {
          // Clear invalid API key
          localStorage.removeItem('etherscan_api_key');
          throw new Error('Invalid Etherscan API key');
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
    try {
      const apiKey = await this.getApiKey();

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
      if (error.message === 'NO_API_KEY') {
        throw error;
      }

      if (axios.isAxiosError(error)) {
        if (error.response?.status === 403 || error.response?.status === 401) {
          localStorage.removeItem('etherscan_api_key');
          throw new Error('Invalid Etherscan API key');
        }
        throw new Error(error.response?.data?.result || 'Failed to check verification status');
      }
      throw error;
    }
  }
}