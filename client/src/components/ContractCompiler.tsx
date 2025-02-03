import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Loader2 } from 'lucide-react';
import { compileSolidity } from '@/lib/compiler';

interface Props {
  sourceCode: string;
  onCompileSuccess: (abi: any[], bytecode: string) => void;
}

export function ContractCompiler({ sourceCode, onCompileSuccess }: Props) {
  const [compiling, setCompiling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCompile = async () => {
    setCompiling(true);
    setError(null);
    
    try {
      const result = await compileSolidity(sourceCode);
      if (result.errors?.length) {
        setError(result.errors[0].formattedMessage);
        return;
      }
      onCompileSuccess(result.abi, result.bytecode);
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
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
