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

  static async getContractSource(contractId: number | string): Promise<string> {
    try {
      const response = await fetch(`/api/contracts/${contractId}`);
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Contract fetch error:', errorText);
        throw new Error(`Failed to fetch contract: ${errorText}`);
      }

      const data = await response.json();
      console.log('Contract data received:', data);

      if (!data.source) {
        console.error('Contract data missing source:', data);
        throw new Error('Contract source code not found in response');
      }

      return data.source;
    } catch (error) {
      console.error('Error in getContractSource:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to fetch contract source code');
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