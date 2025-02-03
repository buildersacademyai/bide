import { type } from "os";

export interface CompileResult {
  abi: any[];
  bytecode: string;
  errors?: any[];
}

let solcjs: any = null;

async function loadCompiler(): Promise<any> {
  if (solcjs) return solcjs;

  try {
    // Create a script element to load solc
    const script = document.createElement('script');
    script.src = 'https://binaries.soliditylang.org/bin/soljson-v0.8.19+commit.7dd6d404.js';
    script.async = true;

    // Wait for the script to load
    await new Promise((resolve, reject) => {
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });

    // Wait for Module to be defined by the solc script
    while (typeof (window as any).Module === 'undefined') {
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    // Initialize the compiler
    return new Promise((resolve) => {
      (window as any).Module.onRuntimeInitialized = () => {
        const soljson = (window as any).Module;
        solcjs = soljson.cwrap('solidity_compile', 'string', ['string']);
        resolve(solcjs);
      };
    });
  } catch (error) {
    console.error('Error loading compiler:', error);
    throw new Error('Failed to load Solidity compiler');
  }
}

export async function compileSolidity(source: string): Promise<CompileResult> {
  try {
    if (!source.trim()) {
      throw new Error('Source code is empty');
    }

    const compiler = await loadCompiler();

    const input = JSON.stringify({
      language: 'Solidity',
      sources: {
        'contract.sol': {
          content: source
        }
      },
      settings: {
        outputSelection: {
          '*': {
            '*': ['abi', 'evm.bytecode']
          }
        },
        optimizer: {
          enabled: true,
          runs: 200
        }
      }
    });

    const output = JSON.parse(compiler(input));

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
    const contractFile = Object.keys(output.contracts['contract.sol'])[0];
    const contract = output.contracts['contract.sol'][contractFile];

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