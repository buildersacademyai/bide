import type { CompileResult } from './types';

const SOLC_VERSION = 'v0.8.19+commit.7dd6d404';

export async function compileSolidity(source: string): Promise<CompileResult> {
  try {
    if (!source.trim()) {
      throw new Error('Source code is empty');
    }

    // Load the Solidity compiler
    const solc = await loadSolcJs();

    // Create wrapper
    const wrapper = solc.cwrap('solidity_compile', 'string', ['string']);

    const input = {
      language: 'Solidity',
      sources: { 'Contract.sol': { content: source } },
      settings: { 
        outputSelection: { '*': { '*': ['*'] } },
        optimizer: {
          enabled: true,
          runs: 200
        }
      }
    };

    // Compile using wrapped compiler
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

async function loadSolcJs(): Promise<any> {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://binaries.soliditylang.org/bin/soljson-${SOLC_VERSION}.js`;
    script.async = true;
    script.onload = () => {
      // Initialize the Module with proper configuration
      (window as any).Module = {
        print: console.log,
        printErr: console.error,
        onRuntimeInitialized: function() {
          resolve(this);
        }
      };
    };
    script.onerror = () => reject(new Error('Failed to load Solidity compiler'));
    document.head.appendChild(script);
  });
}