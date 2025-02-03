import type { CompileResult } from './types';

const SOLC_VERSION = 'v0.8.19+commit.7dd6d404';

export async function compileSolidity(source: string): Promise<CompileResult> {
  try {
    if (!source.trim()) {
      throw new Error('Source code is empty');
    }

    // Load the Solidity compiler
    const solc = await loadSolcJs();

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

    // Compile using loaded compiler
    const output = JSON.parse(solc.compile(JSON.stringify(input)));

    if (output.errors?.length) {
      const errors = output.errors.filter((e: any) => e.severity === 'error');
      if (errors.length > 0) {
        return { 
          abi: [], 
          bytecode: '', 
          errors: output.errors 
        };
      }
    }

    // Get the contract name from the output
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

async function loadSolcJs() {
  const solcjs = await new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://binaries.soliditylang.org/bin/soljson-${SOLC_VERSION}.js`;
    script.onload = () => {
      const solc = (window as any).Module;

      // Wait for the Module to be fully initialized
      if (solc.default) {
        resolve(solc.default);
      } else {
        const checkInterval = setInterval(() => {
          if (solc.default) {
            clearInterval(checkInterval);
            resolve(solc.default);
          }
        }, 50);
      }
    };
    script.onerror = () => reject(new Error('Failed to load Solidity compiler'));
    document.head.appendChild(script);
  });

  return solcjs;
}

export interface CompileResult {
  abi: any[];
  bytecode: string;
  errors?: any[];
}