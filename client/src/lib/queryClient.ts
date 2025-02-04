import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
  headers?: Record<string, string>
): Promise<Response> {
  const address = localStorage.getItem('wallet_address');
  const chainId = localStorage.getItem('chain_id');

  const res = await fetch(url, {
    method,
    headers: {
      ...(data ? { "Content-Type": "application/json" } : {}),
      ...(address ? { "x-owner-address": address } : {}),
      ...(chainId ? { "x-chain-id": chainId } : {}),
      ...headers
    },
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    try {
      const address = localStorage.getItem('wallet_address');
      const chainId = localStorage.getItem('chain_id');
      const headers: Record<string, string> = {};

      if (address) {
        headers['x-owner-address'] = address;
      }
      if (chainId) {
        headers['x-chain-id'] = chainId;
      }

      const res = await fetch(queryKey[0] as string, {
        headers,
        credentials: "include",
      });

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        return null;
      }

      await throwIfResNotOk(res);
      return await res.json();
    } catch (error) {
      if (error instanceof Error && error.message.includes('network')) {
        // Retry the query after a short delay for network-related errors
        await new Promise(resolve => setTimeout(resolve, 1000));
        throw error; // Let React Query handle the retry
      }
      throw error;
    }
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: (failureCount, error) => {
        // Retry up to 3 times for network-related errors
        if (error instanceof Error && error.message.includes('network')) {
          return failureCount < 3;
        }
        return false;
      },
    },
    mutations: {
      retry: false,
    },
  },
});

// Listen for network changes and invalidate queries
window.addEventListener('networkChanged', () => {
  // Add a small delay before invalidating queries to allow the network to stabilize
  setTimeout(() => {
    queryClient.invalidateQueries();
  }, 500);
});