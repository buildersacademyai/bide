import { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { Card } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useMutation } from '@tanstack/react-query';
import { getConnectedAccount } from '@/lib/web3';

interface Props {
  value: string;
  onChange: (value: string) => void;
  contractId?: number;
}

export function ContractEditor({ value, onChange, contractId }: Props) {
  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);
  const [saveTimeout, setSaveTimeout] = useState<NodeJS.Timeout | null>(null);

  // Auto-save mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, sourceCode }: { id: number; sourceCode: string }) => {
      const account = await getConnectedAccount();
      if (!account) {
        throw new Error('Please connect your wallet to save changes');
      }

      const res = await fetch(`/api/contracts/${id}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'x-wallet-address': account
        },
        body: JSON.stringify({ sourceCode }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to save changes');
      }

      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Changes saved",
        description: "Your contract has been updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Failed to save",
        description: error.message,
      });
    },
  });

  // Handle editor changes with debounced auto-save
  const handleEditorChange = (value: string | undefined) => {
    const newValue = value || '';
    onChange(newValue);

    // Only attempt to save if we have a contractId
    if (contractId) {
      if (saveTimeout) {
        clearTimeout(saveTimeout);
      }

      const timeout = setTimeout(() => {
        updateMutation.mutate({
          id: contractId,
          sourceCode: newValue,
        });
      }, 1000); // Debounce for 1 second

      setSaveTimeout(timeout);
    }
  };

  useEffect(() => {
    setMounted(true);
    return () => {
      if (saveTimeout) {
        clearTimeout(saveTimeout);
      }
    };
  }, [saveTimeout]);

  const handleEditorWillMount = (monaco: any) => {
    // Register Solidity language
    monaco.languages.register({ id: 'sol' });
    monaco.languages.setMonarchTokensProvider('sol', {
      tokenizer: {
        root: [
          [/[A-Z][\w$]*/, 'type.identifier'],
          [/[a-zA-Z_$][\w$]*/, 'identifier'],
          [/[=><!~?:&|+\-*\/\^%]+/, 'operator'],
          [/[{}()\[\]]/, '@brackets'],
          [/[;,]/, 'delimiter'],
          [/\/\/.*$/, 'comment'],
          [/\/\*/, 'comment', '@comment'],
          [/\d*\.\d+([eE][\-+]?\d+)?/, 'number.float'],
          [/\d+/, 'number'],
          [/"([^"\\]|\\.)*$/, 'string.invalid'],
          [/'([^'\\]|\\.)*$/, 'string.invalid'],
          [/"/, 'string', '@string_double'],
          [/'/, 'string', '@string_single'],
          [/\b(contract|interface|library|function|constructor|event|modifier|struct|enum|mapping|address|bool|string|int|uint|byte|bytes)\b/, 'keyword'],
          [/\b(public|private|external|internal|pure|view|payable|memory|storage|calldata)\b/, 'keyword'],
          [/\b(returns|return|if|else|for|while|do|break|continue|throw|import|using|pragma|solidity)\b/, 'keyword'],
        ],
        comment: [
          [/[^\/*]+/, 'comment'],
          [/\/\*/, 'comment', '@push'],
          [/\*\//, 'comment', '@pop'],
          [/[\/*]/, 'comment']
        ],
        string_double: [
          [/[^\\"]+/, 'string'],
          [/"/, 'string', '@pop']
        ],
        string_single: [
          [/[^\\']+/, 'string'],
          [/'/, 'string', '@pop']
        ]
      }
    });

    // Set editor theme
    monaco.editor.defineTheme('solidity-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'keyword', foreground: '569CD6', fontStyle: 'bold' },
        { token: 'type.identifier', foreground: '4EC9B0' },
        { token: 'comment', foreground: '6A9955' },
        { token: 'string', foreground: 'CE9178' },
        { token: 'number', foreground: 'B5CEA8' },
      ],
      colors: {
        'editor.background': '#1E1E1E',
      }
    });
  };

  if (!mounted) return null;

  return (
    <Card className="border-2 rounded-lg overflow-hidden">
      <Editor
        height="450px"
        defaultLanguage="sol"
        language="sol"
        theme="solidity-dark"
        value={value}
        onChange={handleEditorChange}
        beforeMount={handleEditorWillMount}
        loading={
          <div className="flex items-center justify-center h-[600px] bg-background">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        }
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          wordWrap: 'on',
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 2,
          formatOnPaste: true,
          formatOnType: true,
          padding: { top: 16, bottom: 16 },
          lineNumbers: 'on',
          lineDecorationsWidth: 0,
          glyphMargin: false,
          folding: true,
          renderLineHighlight: 'all',
        }}
      />
    </Card>
  );
}