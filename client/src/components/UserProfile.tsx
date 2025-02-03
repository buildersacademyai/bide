import { Button } from "@/components/ui/button";
import { User, LogOut } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getConnectedAccount } from '@/lib/web3';
import { WalletInfo } from './WalletInfo';

export function UserProfile() {
  const queryClient = useQueryClient();
  const { data: account } = useQuery({ 
    queryKey: ['wallet'],
    queryFn: getConnectedAccount
  });

  const handleLogout = async () => {
    await queryClient.invalidateQueries({ queryKey: ['wallet'] });
    window.location.reload();
  };

  if (!account) return null;

  return (
    <div className="relative">
      <Button variant="outline" size="icon" onClick={handleLogout}>
        {account ? <LogOut className="h-[1.2rem] w-[1.2rem]" /> : <User className="h-[1.2rem] w-[1.2rem]" />}
      </Button>
      <div className="absolute right-0 mt-2 w-[300px]">
        <WalletInfo address={account} />
      </div>
    </div>
  );
}