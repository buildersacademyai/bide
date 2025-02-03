import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Loader2 } from 'lucide-react';
import { compileSolidity } from '@/lib/compiler';
import { apiRequest } from '@/lib/queryClient';
import { useQueryClient } from '@tanstack/react-query';

interface Props {
  sourceCode: string;
  onCompileSuccess: (abi: any[], bytecode: string) => void;
}

export function ContractCompiler({ sourceCode, onCompileSuccess }: Props) {
  const [compiling, setCompiling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const handleCompile = async () => {
    if (!sourceCode.trim()) {
      setError('Source code cannot be empty');
      return;
    }

    setCompiling(true);
    setError(null);

    try {
      // First, compile the contract
      const result = await compileSolidity(sourceCode);

      if (result.errors?.length) {
        const errorMessages = result.errors
          .filter((e: any) => e.severity === 'error')
          .map((e: any) => e.formattedMessage);

        if (errorMessages.length > 0) {
          setError(errorMessages.join('\n'));
          return;
        }
      }

      if (!result.abi || !result.bytecode) {
        setError('Compilation failed: Invalid contract output');
        return;
      }

      // Call success callback with compilation results
      onCompileSuccess(result.abi, result.bytecode);

      // Update the contract in the database with compilation results
      await apiRequest('POST', '/api/contracts', {
        sourceCode,
        abi: result.abi,
        bytecode: result.bytecode
      });

      // Refresh the contracts list
      await queryClient.invalidateQueries({ queryKey: ['/api/contracts'] });
    } catch (err) {
      console.error('Compilation error:', err);
      setError(err instanceof Error ? err.message : 'Compilation failed');
    } finally {
      setCompiling(false);
    }
  };

  return (
    <div className="space-y-4">
      <Button 
        onClick={handleCompile} 
        disabled={compiling}
        className="w-full"
      >
        {compiling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Compile Contract
      </Button>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="whitespace-pre-wrap font-mono text-sm mt-2">
            {error}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}