import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { lazy, Suspense } from 'react';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { apiErrorStatus } from '@/shared/api/client/apiError';
import { FEED_QUERY_KEY } from '@/shared/api/forum/feedQuery.const';
import { useStore } from '@/store';

const isDev = import.meta.env.DEV;

const ReactQueryDevtools = lazy(() =>
  import('@tanstack/react-query-devtools').then((m) => ({ default: m.ReactQueryDevtools }))
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
            retry: (failureCount, error) =>
              ![401, 403].includes(apiErrorStatus(error) ?? 0) && failureCount < 1,
          },
        },
      })
  );

  // Cached data belongs to the signed-in user. Without this, the next account in the same tab
  // could be served the previous one's profile (or any other per-user query). This covers every way
  // the session ends or is being re-checked (sign-out, expiry, a change in another tab). Another
  // account replacing the session in one step is handled where the user is established
  // (`shared/auth/session.ts`), which compares the cached user's id. A profile edit or a session
  // refresh of the same user keeps the cache.
  useEffect(
    () =>
      useStore.subscribe((state, previous) => {
        if (!previous.isAuthenticated) {
          // Feed pages loaded as a guest (or before the session was restored) carry no `myVote`.
          // Pages on screen are refetched in place (no skeleton flash); pages that are not on
          // screen are dropped, or they would come back with guest data when opened later.
          if (state.isAuthenticated) {
            queryClient.removeQueries({ queryKey: FEED_QUERY_KEY, type: 'inactive' });
            void queryClient.invalidateQueries({ queryKey: FEED_QUERY_KEY });
          }
          return;
        }
        if (!state.isAuthenticated) {
          void queryClient.cancelQueries();
          queryClient.clear();
        }
      }),
    [queryClient]
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {isDev && (
        <Suspense fallback={null}>
          <ReactQueryDevtools initialIsOpen={false} />
        </Suspense>
      )}
    </QueryClientProvider>
  );
}
