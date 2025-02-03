import { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { User, Loader2, LogOut } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getConnectedAccount } from '@/lib/web3';

export function UserProfile() {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);

  const { data: contracts, isLoading } = useQuery<any>({ 
    queryKey: ['/api/contracts'],
    enabled: isOpen // Only fetch when dropdown is open
  });

  const handleLogout = async () => {
    await queryClient.invalidateQueries({ queryKey: ['wallet'] });
    window.location.reload();
  };

  const { data: account } = useQuery({ 
    queryKey: ['wallet'],
    queryFn: getConnectedAccount
  });

  if (!account) return null;

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="relative">
          <User className="h-[1.2rem] w-[1.2rem]" />
          {contracts?.length > 0 && (
            <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-[10px] flex items-center justify-center text-primary-foreground">
              {contracts.length}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[300px]">
        <DropdownMenuLabel className="flex justify-between items-center">
          <div className="flex flex-col">
            <span>Connected Account</span>
            <span className="text-xs text-muted-foreground truncate">
              {account}
            </span>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Disconnect
          </Button>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="max-h-[400px] overflow-y-auto p-2">
          {isLoading ? (
            <div className="flex justify-center p-4">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          ) : contracts?.length ? (
            contracts.map((contract: any) => (
              <Card key={contract.id} className="p-3 mb-2 hover:bg-accent cursor-pointer">
                <div className="font-medium">{contract.name || 'Unnamed Contract'}</div>
                <div className="text-sm text-muted-foreground truncate">
                  {contract.address || 'Not deployed'}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Created: {new Date(contract.createdAt).toLocaleDateString()}
                </div>
              </Card>
            ))
          ) : (
            <div className="text-sm text-muted-foreground text-center py-4">
              No contracts deployed yet
            </div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}