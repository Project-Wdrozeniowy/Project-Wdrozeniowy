import axios from 'axios';
import { useEffect, useRef } from 'react';
import { apiErrorStatus } from '@/shared/api/client/apiError';
import { newOpeningId } from '@/shared/api/forum/openingId';
import {
  OPENING_REQUEST,
  OPENING_RETRIES,
  OPENING_RETRY_DELAYS_MS,
} from '@/shared/api/forum/postOpening.const';
import { useRecordOpening } from '@/shared/api/generated/orbita.api';

/**
 * Worth trying again: the request may not have arrived (network), or the server may recover. A
 * cancelled request is final: the client cancels when the session changed under it, and a retry
 * would send the opening under the new session. A first 403 is tried once more: the client drops
 * its CSRF token on a 403, so the next try fetches a fresh one (a user action is not replayed, but
 * an opening is safe to, by its id); a second 403 is a real refusal.
 */
function worthRetrying(failureCount: number, error: unknown): boolean {
  if (failureCount >= OPENING_RETRIES || axios.isCancel(error)) return false;
  const status = apiErrorStatus(error);
  if (status === 403) return failureCount === 0;
  return status === undefined || status >= 500 || status === 429;
}

/**
 * Tells the platform that the reader opened a post, once per opening: when the post is on screen
 * (`shown`) for a slug the page was not showing before. A re-render, a window focus, a background
 * refetch of the post, a failed or missing post, the statistics and a `#comments` link on the same
 * page record nothing. Another slug, or the page being opened again (a navigation, Back, a reload),
 * is another opening and has its own id.
 *
 * The id belongs to one opening and is reused only to retry it, so a retry never counts twice. The
 * call never gets in the reader's way: no toast, no redirect, no state to wait for.
 */
export function useRecordPostOpening(slug: string, shown: boolean) {
  const { mutate } = useRecordOpening({
    mutation: {
      // The same variables, so the same opening id, on every retry.
      retry: worthRetrying,
      retryDelay: (failureCount) =>
        OPENING_RETRY_DELAYS_MS[Math.min(failureCount, OPENING_RETRY_DELAYS_MS.length - 1)],
      // Offline it fails and is retried like any failure, instead of waiting for a connection.
      networkMode: 'always',
    },
    request: OPENING_REQUEST,
  });
  // The slug whose opening was recorded last. A ref survives React's repeated effect run in
  // development, and being a ref it is gone with the page: a new page is a new opening.
  const recorded = useRef<string | null>(null);

  useEffect(() => {
    if (!shown || slug === '' || recorded.current === slug) return;
    recorded.current = slug;
    let openingId: string;
    try {
      openingId = newOpeningId();
    } catch {
      // No way to name this opening here (no random source): record nothing, and let the reader read.
      return;
    }
    mutate({ slug, data: { openingId } });
  }, [shown, slug, mutate]);
}
