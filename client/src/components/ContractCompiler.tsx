import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card } from '@/components/ui/card';
import { AlertCircle, Loader2 } from 'lucide-react';
import { compileSolidity } from '@/lib/compiler';
import { apiRequest } from '@/lib/queryClient';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

interface Props {
  sourceCode: string;
  onCompileSuccess: (abi: any[], bytecode: string) => void;
}

export function ContractCompiler({ sourceCode, onCompileSuccess }: Props) {
  const [compiling, setCompiling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleCompile = async () => {
    if (!sourceCode.trim()) {
      setError('Source code cannot be empty');
      return;
    }

    setCompiling(true);
    setError(null);

    try {
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

      // Update compilation status
      try {
        await apiRequest('POST', '/api/contracts', {
          name: 'New Contract',
          sourceCode,
          abi: result.abi,
          bytecode: result.bytecode
        });

        // Refresh the contracts list
        await queryClient.invalidateQueries({ queryKey: ['/api/contracts'] });

        // Show success message
        toast({
          title: "Compilation successful",
          description: "Contract compiled and saved successfully",
        });

        // Call success callback
        onCompileSuccess(result.abi, result.bytecode);
      } catch (err) {
        toast({
          variant: "destructive",
          title: "Failed to save contract",
          description: err instanceof Error ? err.message : "Failed to save compilation result",
        });
      }
    } catch (err) {
      console.error('Compilation error:', err);
      setError(err instanceof Error ? err.message : 'Compilation failed');

      toast({
        variant: "destructive",
        title: "Compilation failed",
        description: err instanceof Error ? err.message : "An error occurred during compilation",
      });
    } finally {
      setCompiling(false);
    }
  };

  return (
    <Card className="p-4">
      <Button 
        onClick={handleCompile} 
        disabled={compiling}
        className="w-full"
      >
        {compiling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Compile Contract
      </Button>

      {error && (
        <Alert variant="destructive" className="mt-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="whitespace-pre-wrap font-mono text-sm mt-2">
            {error}
          </AlertDescription>
        </Alert>
      )}
    </Card>
  );
}