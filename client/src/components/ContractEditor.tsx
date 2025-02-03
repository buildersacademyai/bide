import { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { Card } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

interface Props {
  value: string;
  onChange: (value: string) => void;
}

export function ContractEditor({ value, onChange }: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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
  };

  if (!mounted) return null;

  return (
    <Card className="h-[600px] w-full relative overflow-hidden">
      <Editor
        height="100%"
        defaultLanguage="sol"
        language="sol"
        theme="vs-dark"
        value={value}
        onChange={(value) => onChange(value || '')}
        beforeMount={handleEditorWillMount}
        loading={<div className="flex items-center justify-center h-full">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>}
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          wordWrap: 'on',
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 2,
          formatOnPaste: true,
          formatOnType: true,
        }}
      />
    </Card>
  );
}