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

  private static getSupportedCompilerVersion(version: string): string {
    // Remove the ^ if present and just get the version number
    const cleanVersion = version.replace('^', '');

    // Map of supported compiler versions
    const supportedVersions: Record<string, string> = {
      '0.8.0': 'v0.8.0+commit.c7dfd78e',
      '0.8.1': 'v0.8.1+commit.df193b15',
      '0.8.2': 'v0.8.2+commit.661d1103',
      '0.8.3': 'v0.8.3+commit.8d00100c',
      '0.8.4': 'v0.8.4+commit.c7e474f2',
      '0.8.5': 'v0.8.5+commit.a4f2e591',
      '0.8.6': 'v0.8.6+commit.11564f7e',
      '0.8.7': 'v0.8.7+commit.e28d00a7',
      '0.8.8': 'v0.8.8+commit.dddeac2f',
      '0.8.9': 'v0.8.9+commit.e5eed63a',
      '0.8.10': 'v0.8.10+commit.fc410830',
      '0.8.11': 'v0.8.11+commit.d7f03943',
      '0.8.12': 'v0.8.12+commit.f00d7308',
      '0.8.13': 'v0.8.13+commit.abaa5c0e',
      '0.8.14': 'v0.8.14+commit.80d49f37',
      '0.8.15': 'v0.8.15+commit.e14f2714',
      '0.8.16': 'v0.8.16+commit.07a7930e',
      '0.8.17': 'v0.8.17+commit.8df45f5f',
      '0.8.18': 'v0.8.18+commit.87f61d96',
      '0.8.19': 'v0.8.19+commit.7dd6d404',
      '0.8.20': 'v0.8.20+commit.a1b79de6',
    };

    // Find the closest matching version
    for (const [key, value] of Object.entries(supportedVersions)) {
      if (cleanVersion.startsWith(key)) {
        return value;
      }
    }

    // Default to a common stable version if no match found
    return 'v0.8.17+commit.8df45f5f';
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

      // Extract actual contract name from the source code
      const contractNameMatch = sourceCode.match(/contract\s+(\w+)/);
      if (!contractNameMatch) {
        throw new Error('Could not find contract name in source code');
      }
      const actualContractName = contractNameMatch[1];

      // Extract the solidity version from the source code
      const versionMatch = sourceCode.match(/pragma solidity\s+([^;]+)/);
      if (!versionMatch) {
        throw new Error('Could not determine Solidity version from source code');
      }

      // Get supported compiler version
      const compilerVersion = this.getSupportedCompilerVersion(versionMatch[1].trim());

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
            compilerversion: compilerVersion,
            optimizationUsed: 0,
            runs: 200,
            evmversion: 'default', // Use default for better compatibility
            licenseType: 1 // MIT License
          },
        }
      );

      if (response.data.status === '0') {
        throw new Error(response.data.result);
      }

      return response.data.result; // This is the GUID for checking verification status
    } catch (error) {
      if (error instanceof Error && error.message === 'NO_API_KEY') {
        throw error;
      }

      if (axios.isAxiosError(error)) {
        if (error.response?.status === 403 || error.response?.status === 401) {
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
          message: response.data.result,
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