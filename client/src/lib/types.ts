export interface CompileResult {
  abi: any[];
  bytecode: string;
  errors?: Array<{
    severity: string;
    formattedMessage: string;
  }>;
}

export interface Contract {
  id: number;
  name: string;
  type: 'file' | 'folder';
  sourceCode?: string;
  abi?: any[];
  bytecode?: string;
  address?: string;
  network?: string;
}