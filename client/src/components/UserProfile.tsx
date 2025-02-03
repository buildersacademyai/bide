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
import { useQuery } from "@tanstack/react-query";
import { getConnectedAccount } from '@/lib/web3';

export function UserProfile() {
  const { data: contracts, isLoading } = useQuery<any>({ 
    queryKey: ['/api/contracts']
  });

  const handleLogout = async () => {
    window.location.reload(); // This will reset the wallet connection
  };

  const checkConnection = async () => {
    const account = await getConnectedAccount();
    return account;
  };

  const { data: account } = useQuery({ 
    queryKey: ['wallet'],
    queryFn: checkConnection
  });

  if (!account) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon">
          <User className="h-[1.2rem] w-[1.2rem]" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[300px]">
        <DropdownMenuLabel className="flex justify-between items-center">
          <span>Your Contracts</span>
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
              <Card key={contract.id} className="p-3 mb-2 hover:bg-accent">
                <div className="font-medium">{contract.name || 'Unnamed Contract'}</div>
                <div className="text-sm text-muted-foreground truncate">
                  {contract.address || 'Not deployed'}
                </div>
              </Card>
            ))
          ) : (
            <div className="text-sm text-muted-foreground text-center py-2">
              No contracts deployed yet
            </div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}