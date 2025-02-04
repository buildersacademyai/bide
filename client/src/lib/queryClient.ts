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
  const token = localStorage.getItem('token');
  const defaultHeaders: Record<string, string> = {
    ...(data ? { "Content-Type": "application/json" } : {}),
    ...(token ? { "Authorization": `Bearer ${token}` } : {}),
    ...headers
  };

  const res = await fetch(url, {
    method,
    headers: defaultHeaders,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}


export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        if (error instanceof Error && error.message.includes('401')) {
          return false;
        }
        return failureCount < 3;
      },
      refetchOnWindowFocus: true,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

// Listen for auth changes and invalidate queries
window.addEventListener('storage', (event) => {
  if (event.key === 'token') {
    queryClient.invalidateQueries();
  }
});

// Listen for network changes and invalidate queries
window.addEventListener('networkChanged', () => {
  setTimeout(() => {
    queryClient.invalidateQueries();
  }, 500);
});