import * as wrapper from 'solc/wrapper';

export interface CompileResult {
  abi: any[];
  bytecode: string;
  errors?: any[];
}

let solc: any = null;

async function loadCompiler() {
  if (solc) return solc;

  // Load the solc compiler dynamically
  const response = await fetch('https://binaries.soliditylang.org/bin/soljson-v0.8.19+commit.7dd6d404.js');
  const compiler = await response.text();
  // Define it in window scope
  const script = document.createElement('script');
  script.text = compiler;
  document.head.appendChild(script);

  // @ts-ignore
  solc = wrapper(window.Module);
  return solc;
}

export async function compileSolidity(source: string): Promise<CompileResult> {
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

  try {
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