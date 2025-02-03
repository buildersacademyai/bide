import type { CompileResult } from './types';

const SOLC_VERSION = 'v0.8.19+commit.7dd6d404';

export async function compileSolidity(source: string): Promise<CompileResult> {
  try {
    if (!source.trim()) {
      throw new Error('Source code is empty');
    }

    // Load browser version of solc
    const solc = await loadBrowserSolc();

    const input = {
      language: 'Solidity',
      sources: {
        'Contract.sol': {
          content: source
        }
      },
      settings: {
        outputSelection: {
          '*': {
            '*': ['*']
          }
        }
      }
    };

    const output = JSON.parse(solc.compile(JSON.stringify(input)));

    if (output.errors?.length) {
      const errors = output.errors
        .filter((e: any) => e.severity === 'error')
        .map((e: any) => e.formattedMessage);

      if (errors.length > 0) {
        return { 
          abi: [], 
          bytecode: '', 
          errors: output.errors 
        };
      }
    }

    // Get the contract from the output
    const contractFile = Object.keys(output.contracts['Contract.sol'])[0];
    const contract = output.contracts['Contract.sol'][contractFile];

    return {
      abi: contract.abi,
      bytecode: contract.evm.bytecode.object,
      errors: output.errors
    };
  } catch (error) {
    console.error('Compilation error:', error);
    throw new Error(`Compilation failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function loadBrowserSolc(): Promise<any> {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://binaries.soliditylang.org/bin/soljson-v0.8.19+commit.7dd6d404.js';
    script.onload = () => {
      // @ts-ignore
      const solc = window.Module;
      resolve(solc);
    };
    script.onerror = () => reject(new Error('Failed to load Solidity compiler'));
    document.head.appendChild(script);
  });
}