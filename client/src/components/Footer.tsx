import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Copy, Heart, Check, Mail, Twitter, Github } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function Footer() {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const email = 'contact@buildersacademy.ai';

  const handleCopyEmail = async () => {
    await navigator.clipboard.writeText(email);
    setCopied(true);
    toast({
      title: "Email copied!",
      description: "Email address copied to clipboard",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <footer className="w-full mx-auto border-t py-6 bg-background flex flex-col">
      <div className="container flex flex-col items-center justify-between gap-4 md:h-16 md:flex-row md:py-0">
        <div className="flex flex-col items-center gap-4 px-8 md:flex-row md:gap-2 md:px-0">
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            Made with <Heart className="h-4 w-4 text-red-500 animate-pulse" /> by BA Team
          </p>
          <span className="hidden md:inline text-muted-foreground">•</span>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 gap-2"
            onClick={handleCopyEmail}
          >
            <Mail className="h-4 w-4" />
            {email}
            {copied ? (
              <Check className="h-4 w-4" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        </div>

        <div className="flex flex-col items-center gap-4 md:flex-row md:gap-6">
          <div className="flex gap-4">
            <Button variant="ghost" size="icon" onClick={() => window.open('https://twitter.com/buildersacademy', '_blank')}>
              <Twitter className="h-4 w-4" />
              <span className="sr-only">Twitter</span>
            </Button>
            <Button variant="ghost" size="icon" onClick={() => window.open('https://github.com/buildersacademy', '_blank')}>
              <Github className="h-4 w-4" />
              <span className="sr-only">GitHub</span>
            </Button>
          </div>

        </div>

      </div>
      <p className="text-center text-sm text-muted-foreground mt-4">
        © {new Date().getFullYear()} Builders Academy. All rights reserved.
      </p>
    </footer>
  );
}