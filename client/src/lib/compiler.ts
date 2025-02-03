export interface CompileResult {
  abi: any[];
  bytecode: string;
  errors?: any[];
}

let solcjs: any = null;

async function loadCompiler(): Promise<any> {
  if (solcjs) return solcjs;

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
      // Create the solc compiler instance
      solcjs = {
        compile: (input: string) => {
          return soljson.cwrap('solidity_compile', 'string', ['string'])(input);
        }
      };
      resolve(solcjs);
    };
  });
}

export async function compileSolidity(source: string): Promise<CompileResult> {
  try {
    const compiler = await loadCompiler();

    const input = {
      language: 'Solidity',
      sources: {
        'contract.sol': {
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

    const output = JSON.parse(compiler.compile(JSON.stringify(input)));

    if (output.errors?.some((e: any) => e.severity === 'error')) {
      return { abi: [], bytecode: '', errors: output.errors };
    }

    const contractName = Object.keys(output.contracts['contract.sol'])[0];
    const contract = output.contracts['contract.sol'][contractName];

    return {
      abi: contract.abi,
      bytecode: contract.evm.bytecode.object,
      errors: output.errors
    };
  } catch (error) {
    throw new Error(`Compilation failed: ${error}`);
  }
}