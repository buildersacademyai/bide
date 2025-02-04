import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';

export interface AuthUser {
  id: number;
  wallet_address: string;
}

interface AuthResponse {
  user: AuthUser;
  token: string;
}

export function useAuth() {
  const { data: user, isLoading } = useQuery<AuthUser>({
    queryKey: ['auth', 'user'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      if (!token) return null;

      try {
        const res = await fetch('/api/user', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!res.ok) throw new Error('Failed to get user');
        return res.json();
      } catch (error) {
        localStorage.removeItem('token');
        throw error;
      }
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (wallet_address: string): Promise<AuthResponse> => {
      const res = await apiRequest('POST', '/api/login', { wallet_address });
      const data = await res.json();
      localStorage.setItem('token', data.token);
      return data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['auth', 'user'], data.user);
    },
  });

  const logout = () => {
    localStorage.removeItem('token');
    queryClient.setQueryData(['auth', 'user'], null);
  };

  return {
    user,
    isLoading,
    login: loginMutation.mutate,
    logout,
    isLoggingIn: loginMutation.isPending,
  };
}
