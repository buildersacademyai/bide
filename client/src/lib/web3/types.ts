import { type TransactionResponse } from 'ethers';

export interface ContractFunction {
  name: string;
  type: string;
  inputs: {
    name: string;
    type: string;
    indexed?: boolean;
  }[];
  outputs?: {
    name: string;
    type: string;
  }[];
  stateMutability?: string;
}

export interface DeployedContract {
  id: number;
  name: string;
  address: string;
  abi: ContractFunction[];
  network: string;
  createdAt: string;
}

export interface ContractCallResult {
  success: boolean;
  result?: any;
  error?: string;
}

export interface Web3Error extends Error {
  code?: string | number;
  transaction?: TransactionResponse;
}
