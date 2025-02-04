import { Button } from '@/components/ui/button';
import { Clock } from 'lucide-react';

export function VerifiedContracts() {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold">Contract Verification</h2>
          <span className="bg-yellow-500/10 text-yellow-500 text-sm px-2 py-1 rounded-md flex items-center gap-1">
            <Clock className="h-4 w-4" />
            Coming Soon
          </span>
        </div>

        <div className="p-6 border rounded-lg bg-muted/50">
          <div className="flex flex-col items-center justify-center text-center space-y-4">
            <Clock className="h-12 w-12 text-muted-foreground" />
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Contract Verification Coming Soon</h3>
              <p className="text-muted-foreground max-w-md">
                We're working on implementing contract verification with Etherscan integration.
                This feature will allow you to verify your smart contracts directly from the IDE.
              </p>
            </div>
            <Button disabled className="mt-4">
              Verify Contract
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}