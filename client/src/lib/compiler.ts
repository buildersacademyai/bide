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
        },
        optimizer: {
          enabled: true,
          runs: 200
        }
      }
    };

    const output = JSON.parse(wrapper(JSON.stringify(input)));

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

let solcPromise: Promise<any> | null = null;

function loadBrowserSolc(): Promise<any> {
  if (solcPromise) {
    return solcPromise;
  }

  solcPromise = new Promise((resolve, reject) => {
    // Check if Module is already loaded
    // @ts-ignore
    if (window.Module && window.Module.cwrap) {
      // @ts-ignore
      const compile = window.Module.cwrap('compileStandard', 'string', ['string']);
      resolve(compile);
      return;
    }

    const script = document.createElement('script');
    script.src = `https://binaries.soliditylang.org/bin/soljson-${SOLC_VERSION}.js`;
    script.async = true;

    script.onload = () => {
      // Wait for module initialization with longer timeout
      let attempts = 0;
      const maxAttempts = 50; // 10 seconds total
      const checkInterval = setInterval(() => {
        attempts++;
        // @ts-ignore
        if (window.Module && window.Module.cwrap) {
          clearInterval(checkInterval);
          // @ts-ignore
          const compile = window.Module.cwrap('compileStandard', 'string', ['string']);
          resolve(compile);
        } else if (attempts >= maxAttempts) {
          clearInterval(checkInterval);
          reject(new Error('Timeout waiting for Solidity compiler initialization'));
        }
      }, 200);
    };

    script.onerror = () => {
      solcPromise = null; // Reset promise on error
      reject(new Error('Failed to load Solidity compiler'));
    };

    document.head.appendChild(script);
  });

  return solcPromise;
}