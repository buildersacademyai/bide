import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import solc from 'solc';

interface CompileResult {
  abi: any[];
  bytecode: string;
  errors?: Array<{
    severity: string;
    formattedMessage: string;
  }>;
}

export async function compileContract(sourceCode: string): Promise<CompileResult> {
  // Input structure for solc
  const input = {
    language: 'Solidity',
    sources: {
      'contract.sol': {
        content: sourceCode
      }
    },
    settings: {
      outputSelection: {
        '*': {
          '*': ['*']
        }
      },
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  };

  try {
    // Compile the contract
    const output = JSON.parse(
      solc.compile(JSON.stringify(input))
    );

    // Check for errors
    if (output.errors) {
      const errors = output.errors.filter(
        (error: any) => error.severity === 'error'
      );
      if (errors.length > 0) {
        throw new Error(
          errors.map((e: any) => e.formattedMessage).join('\n')
        );
      }
    }

    // Get the contract
    const contractFile = Object.keys(output.contracts['contract.sol'])[0];
    if (!contractFile) {
      throw new Error('No contract found in compilation output');
    }

    const contract = output.contracts['contract.sol'][contractFile];
    if (!contract || !contract.abi || !contract.evm) {
      throw new Error('Invalid compilation output structure');
    }

    return {
      abi: contract.abi,
      bytecode: contract.evm.bytecode.object,
      errors: output.errors
    };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Compilation failed: ${error.message}`);
    }
    throw new Error('Compilation failed with unknown error');
  }
}