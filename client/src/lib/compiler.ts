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
      sources: { 'Contract.sol': { content: source } },
      settings: { outputSelection: { '*': { '*': ['*'] } } }
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
      // Wait for the Module to be fully initialized
      const checkForModule = () => {
        if ((window as any).Module) {
          resolve((window as any).Module);
        } else {
          setTimeout(checkForModule, 100);
        }
      };
      checkForModule();
    };
    script.onerror = () => reject(new Error('Failed to load Solidity compiler'));
    document.head.appendChild(script);
  });

  return solcjs;
}