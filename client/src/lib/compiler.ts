// This file is now deprecated as we're using server-side compilation
// Keeping the types for reference
export interface CompileResult {
  abi: any[];
  bytecode: string;
  errors?: Array<{
    severity: string;
    formattedMessage: string;
  }>;
}