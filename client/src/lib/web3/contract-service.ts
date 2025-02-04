import { ethers } from 'ethers';
import type { ContractFunction, ContractCallResult, Web3Error } from './types';

export class ContractService {
  private static formatError(error: any): Web3Error {
    const web3Error: Web3Error = new Error(
      error.message || 'Contract interaction failed'
    );
    web3Error.code = error.code;
    web3Error.transaction = error.transaction;
    return web3Error;
  }

  private static formatValue(value: string, type: string): any {
    if (type.startsWith('uint') || type.startsWith('int')) {
      return ethers.parseUnits(value || '0', 0);
    }
    if (type === 'bool') {
      return value.toLowerCase() === 'true';
    }
    if (type.includes('[]')) {
      try {
        return JSON.parse(value);
      } catch {
        return [];
      }
    }
    return value;
  }

  private static formatResult(result: any): string {
    if (result === null || result === undefined) {
      return 'No value';
    }
    if (result._isBigNumber || typeof result === 'bigint') {
      return result.toString();
    }
    if (Array.isArray(result)) {
      return result.map(item => ContractService.formatResult(item)).join(', ');
    }
    if (typeof result === 'object') {
      try {
        return JSON.stringify(result, (_, value) =>
          typeof value === 'bigint' ? value.toString() : value
        , 2);
      } catch {
        return 'Complex object';
      }
    }
    return String(result);
  }

  static async getContractSource(contractId: string): Promise<string> {
    try {
      const response = await fetch(`/api/contracts/${contractId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch contract data');
      }

      const data = await response.json();
      if (!data.source) {
        throw new Error('Contract source not found');
      }

      return data.source;
    } catch (error) {
      console.error('Error fetching contract source:', error);
      throw error;
    }
  }

  static async callFunction(
    address: string,
    abi: ContractFunction[],
    functionName: string,
    inputs: string[]
  ): Promise<ContractCallResult> {
    try {
      if (!window.ethereum) {
        throw new Error('MetaMask is not installed');
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(address, abi, signer);

      // Find function in ABI and convert inputs
      const functionAbi = abi.find(item => item.name === functionName);
      if (!functionAbi) {
        throw new Error(`Function ${functionName} not found in ABI`);
      }

      const convertedInputs = inputs.map((value, index) => 
        this.formatValue(value, functionAbi.inputs[index].type)
      );

      const result = await contract[functionName](...convertedInputs);

      return {
        success: true,
        result: this.formatResult(result)
      };
    } catch (error: any) {
      console.error('Contract call error:', error);
      return {
        success: false,
        error: error.message || 'Contract call failed'
      };
    }
  }
}