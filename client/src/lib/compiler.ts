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
    script.src = `https://binaries.soliditylang.org/bin/soljson-${SOLC_VERSION}.js`;
    script.async = true;
    script.onload = () => {
      // @ts-ignore
      if (!window.Module) {
        reject(new Error('Failed to load Solidity compiler module'));
        return;
      }

      // Wait for module initialization
      const checkInterval = setInterval(() => {
        // @ts-ignore
        if (window.Module.cwrap) {
          clearInterval(checkInterval);
          // @ts-ignore
          const solidity_compile = window.Module.cwrap('compileStandard', 'string', ['string']);
          resolve(solidity_compile);
        }
      }, 100);

      // Set timeout for initialization
      setTimeout(() => {
        clearInterval(checkInterval);
        reject(new Error('Timeout waiting for Solidity compiler initialization'));
      }, 5000);
    };
    script.onerror = () => reject(new Error('Failed to load Solidity compiler'));
    document.head.appendChild(script);
  });
}