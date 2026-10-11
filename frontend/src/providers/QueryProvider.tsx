'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import dynamic from 'next/dynamic';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { useStore } from '@/store';

const isDev = process.env.NODE_ENV === 'development';

const ReactQueryDevtools = dynamic(
  () => import('@tanstack/react-query-devtools').then((m) => m.ReactQueryDevtools),
  { ssr: false }
);

interface QueryProviderProps {
  children: ReactNode;
}

export default function QueryProvider({ children }: QueryProviderProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            retry: 1,
          },
        },
      })
  );

  // Cached data belongs to the signed-in user. Without this, the next account in the same tab
  // could be served the previous one's profile (or any other per-user query).
  useEffect(
    () =>
      useStore.subscribe((state, previous) => {
        if (previous.isAuthenticated && !state.isAuthenticated) {
          queryClient.clear();
        }
      }),
    [queryClient]
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {isDev && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}
