import type { CompileResult } from './types';

const SOLC_VERSION = 'v0.8.19+commit.7dd6d404';

export async function compileSolidity(source: string): Promise<CompileResult> {
  try {
    if (!source.trim()) {
      throw new Error('Source code is empty');
    }

    // Load browser version of solc
    const wrapper = await loadBrowserSolc();

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

    const output = JSON.parse(wrapper(JSON.stringify(input)));

    // Check for compilation errors
    if (output.errors?.length) {
      return { 
        abi: [], 
        bytecode: '', 
        errors: output.errors 
      };
    }

    // Get the first contract from the output
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

let solcPromise: Promise<any> | null = null;

function loadBrowserSolc(): Promise<any> {
  if (solcPromise) {
    return solcPromise;
  }

  solcPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://binaries.soliditylang.org/bin/soljson-${SOLC_VERSION}.js`;
    script.async = true;

    script.onload = () => {
      let attempts = 0;
      const maxAttempts = 100; // Increased timeout duration
      const checkInterval = 100; // Checking more frequently

      const timer = setInterval(() => {
        attempts++;
        try {
          // @ts-ignore
          if (window.Module) {
            // @ts-ignore
            const compile = window.Module.cwrap('compileStandard', 'string', ['string']);
            clearInterval(timer);
            resolve(compile);
          } else if (attempts >= maxAttempts) {
            clearInterval(timer);
            reject(new Error('Failed to initialize Solidity compiler'));
          }
        } catch (e) {
          if (attempts >= maxAttempts) {
            clearInterval(timer);
            reject(new Error('Error initializing Solidity compiler'));
          }
        }
      }, checkInterval);
    };

    script.onerror = () => {
      solcPromise = null;
      reject(new Error('Failed to load Solidity compiler script'));
    };

    document.head.appendChild(script);
  });

  return solcPromise;
}