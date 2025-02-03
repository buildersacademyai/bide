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
      const result = await compileSolidity(sourceCode);

      // Check for compilation errors
      if (result.errors?.some(e => e.severity === 'error')) {
        setError(result.errors.map(e => e.formattedMessage).join('\n'));
        return;
      }

      if (!result.abi || !result.bytecode) {
        setError('Compilation failed: Invalid contract output');
        return;
      }

      // Save compilation result to database
      try {
        await apiRequest('POST', '/api/contracts', {
          name: 'New Contract',
          sourceCode,
          abi: result.abi,
          bytecode: result.bytecode
        });

        // Invalidate contracts query to refresh the list
        await queryClient.invalidateQueries({ queryKey: ['/api/contracts'] });

        // Call success callback
        onCompileSuccess(result.abi, result.bytecode);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save contract');
        return;
      }
    } catch (err) {
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
          <AlertDescription className="whitespace-pre-wrap font-mono text-sm">
            {error}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}