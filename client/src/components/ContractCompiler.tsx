import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card } from '@/components/ui/card';
import { AlertCircle, Loader2, Terminal } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

interface Props {
  sourceCode: string;
  onCompileSuccess: (abi: any[], bytecode: string) => void;
}

export function ContractCompiler({ sourceCode, onCompileSuccess }: Props) {
  const { toast } = useToast();
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
      // Show loading toast
      toast({
        title: "Compiling contract",
        description: "Please wait while the contract is being compiled...",
      });

      const response = await fetch('/api/compile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceCode })
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.errors) {
          setError(data.errors.map((e: any) => e.formattedMessage).join('\n'));
          toast({
            variant: "destructive",
            title: "Compilation failed",
            description: "Contract has compilation errors",
          });
          return;
        }
        throw new Error(data.message || 'Compilation failed');
      }

      // Refresh the contracts list
      await queryClient.invalidateQueries({ queryKey: ['/api/contracts'] });

      // Show success message
      toast({
        title: "Compilation successful",
        description: `Contract compiled successfully`,
      });

      // Call success callback with the results
      onCompileSuccess(data.abi, data.bytecode);
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
      <div className="flex gap-2">
        <Button 
          onClick={handleCompile} 
          disabled={compiling || !sourceCode.trim()}
          className="flex-1"
        >
          {compiling ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Terminal className="mr-2 h-4 w-4" />
          )}
          {compiling ? 'Compiling...' : 'Compile Contract'}
        </Button>
      </div>

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