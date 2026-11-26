import { onlineManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { AxiosInstance } from 'axios';
import MockAdapter from 'axios-mock-adapter';
import axios from 'axios';
import type { ReactNode } from 'react';
import { vi } from 'vitest';
import type * as OpeningConst from '@/shared/api/forum/postOpening.const';
import { apiClient } from '@/shared/api/client/api';
import { useRecordPostOpening } from '@/shared/api/forum/useRecordPostOpening';
import { toast } from '@/shared/lib/toast';

/** The rules of the hook, on their own: the page it serves is tested in PostOpening.integration. */

vi.mock('@/shared/lib/toast', () => ({
  API_ERROR_TOAST_ID: 'api-error',
  toast: { error: vi.fn(), success: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));
vi.mock('@/shared/api/forum/postOpening.const', async (importOriginal) => ({
  ...(await importOriginal<typeof OpeningConst>()),
  OPENING_RETRY_DELAYS_MS: [0, 0],
}));

const axiosInstance = (apiClient as unknown as { client: AxiosInstance }).client;
let mock: MockAdapter;

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient();
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

const sent = (slug?: string) =>
  mock.history.post.filter((request) =>
    slug ? request.url === `/forum/posts/${slug}/openings` : /\/openings$/.test(request.url ?? '')
  );
const settle = () => act(() => new Promise((resolve) => setTimeout(resolve, 40)));

function renderOpening(initial: { slug: string; shown: boolean }) {
  return renderHook(({ slug, shown }) => useRecordPostOpening(slug, shown), {
    initialProps: initial,
    wrapper,
  });
}

/** The first handler that matches answers, so a test that fails the recording starts over. */
function answerOpeningsWith(reply: (handler: ReturnType<MockAdapter['onPost']>) => void) {
  mock.resetHandlers();
  mock.onGet('/auth/csrf').reply(200, { token: 'csrf', headerName: 'X-CSRF-TOKEN' });
  reply(mock.onPost(/\/forum\/posts\/[^/]+\/openings$/));
}

beforeEach(() => {
  vi.clearAllMocks();
  mock = new MockAdapter(axiosInstance);
  apiClient.clearCsrf();
  answerOpeningsWith((handler) => handler.reply(204));
});
afterEach(() => mock.restore());

describe('when an opening is recorded', () => {
  it('waits for the post to be shown', async () => {
    const { rerender } = renderOpening({ slug: 'a', shown: false });
    await settle();
    expect(sent()).toHaveLength(0);

    rerender({ slug: 'a', shown: true });

    await waitFor(() => expect(sent('a')).toHaveLength(1));
  });

  it('records nothing without a slug', async () => {
    renderOpening({ slug: '', shown: true });
    await settle();

    expect(sent()).toHaveLength(0);
  });

  it('records once for a slug, however often it is shown, hidden and shown again', async () => {
    const { rerender } = renderOpening({ slug: 'a', shown: true });
    await waitFor(() => expect(sent('a')).toHaveLength(1));

    rerender({ slug: 'a', shown: false });
    rerender({ slug: 'a', shown: true });
    rerender({ slug: 'a', shown: true });
    await settle();

    expect(sent()).toHaveLength(1);
  });

  it('records the next slug, and a slug again after another one was shown', async () => {
    const { rerender } = renderOpening({ slug: 'a', shown: true });
    await waitFor(() => expect(sent('a')).toHaveLength(1));

    rerender({ slug: 'b', shown: false });
    rerender({ slug: 'b', shown: true });
    await waitFor(() => expect(sent('b')).toHaveLength(1));
    rerender({ slug: 'a', shown: true });

    await waitFor(() => expect(sent('a')).toHaveLength(2));
    expect(new Set(sent().map((request) => JSON.parse(request.data).openingId)).size).toBe(3);
  });

  it('encodes nothing about the reader in the request: the id is the whole body', async () => {
    renderOpening({ slug: 'a', shown: true });
    await waitFor(() => expect(sent()).toHaveLength(1));

    expect(Object.keys(JSON.parse(sent()[0].data))).toEqual(['openingId']);
  });
});

describe('when the reader moves on while a delivery is being retried', () => {
  it('still delivers the first opening, with its own id, and records the next one', async () => {
    answerOpeningsWith((handler) =>
      handler
        .replyOnce(503)
        .onPost(/openings$/)
        .reply(204)
    );
    const { rerender } = renderOpening({ slug: 'a', shown: true });

    // The first delivery is in flight, and will fail and be retried, when another post is shown.
    rerender({ slug: 'b', shown: true });

    await waitFor(() => expect(sent('a')).toHaveLength(2));
    await waitFor(() => expect(sent('b')).toHaveLength(1));
    const ids = (slug: string) => sent(slug).map((request) => JSON.parse(request.data).openingId);
    expect(new Set(ids('a')).size).toBe(1);
    expect(ids('b')[0]).not.toBe(ids('a')[0]);
  });
});

describe('when no id can be made', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('records nothing and leaves the page alone', async () => {
    vi.stubGlobal('crypto', undefined);

    // An error thrown by the effect would reach the render and unmount the page.
    expect(() => renderOpening({ slug: 'a', shown: true })).not.toThrow();
    await settle();

    expect(sent()).toHaveLength(0);
  });
});

describe('when the recording fails', () => {
  it.each([
    ['a server error', 500],
    ['an unavailable gateway', 503],
    ['too many requests', 429],
  ])('tries %s again, with the same id', async (_what, status) => {
    answerOpeningsWith((handler) => handler.reply(status));
    renderOpening({ slug: 'a', shown: true });

    await waitFor(() => expect(sent()).toHaveLength(3));
    await settle();

    expect(sent()).toHaveLength(3);
    expect(new Set(sent().map((request) => request.data)).size).toBe(1);
  });

  it('tries a lost connection again, with the same id', async () => {
    answerOpeningsWith((handler) => handler.networkError());
    renderOpening({ slug: 'a', shown: true });

    await waitFor(() => expect(sent()).toHaveLength(3));
    expect(new Set(sent().map((request) => request.data)).size).toBe(1);
  });

  it.each([400, 401, 404, 422])('does not try again after a %i', async (status) => {
    answerOpeningsWith((handler) => handler.reply(status));
    renderOpening({ slug: 'a', shown: true });

    await waitFor(() => expect(sent()).toHaveLength(1));
    await settle();

    expect(sent()).toHaveLength(1);
  });

  it('tries a first 403 once more, with the same id, because the client then fetches a new CSRF token', async () => {
    answerOpeningsWith((handler) =>
      handler
        .replyOnce(403)
        .onPost(/openings$/)
        .reply(204)
    );
    renderOpening({ slug: 'a', shown: true });

    await waitFor(() => expect(sent()).toHaveLength(2));
    await settle();

    expect(sent()).toHaveLength(2);
    expect(new Set(sent().map((request) => request.data)).size).toBe(1);
  });

  it('gives up on a 403 that comes again: that is a refusal', async () => {
    answerOpeningsWith((handler) => handler.reply(403));
    renderOpening({ slug: 'a', shown: true });

    await waitFor(() => expect(sent()).toHaveLength(2));
    await settle();

    expect(sent()).toHaveLength(2);
  });

  it('does not send a cancelled opening again: the session it was for has gone', async () => {
    answerOpeningsWith((handler) =>
      handler.reply(() => Promise.reject(new axios.CanceledError('Session changed')))
    );
    renderOpening({ slug: 'a', shown: true });

    await waitFor(() => expect(sent()).toHaveLength(1));
    await settle();

    expect(sent()).toHaveLength(1);
  });

  it('is sent, and retried, even when the browser says it is offline, and not held back for a connection', async () => {
    onlineManager.setOnline(false);
    try {
      answerOpeningsWith((handler) => handler.networkError());
      renderOpening({ slug: 'a', shown: true });

      await waitFor(() => expect(sent()).toHaveLength(3));
      await settle();

      expect(sent()).toHaveLength(3);
    } finally {
      onlineManager.setOnline(true);
    }
  });

  it('says nothing: no toast, whatever the answer', async () => {
    answerOpeningsWith((handler) => handler.reply(500, { detail: 'PSQLException' }));
    renderOpening({ slug: 'a', shown: true });

    await waitFor(() => expect(sent()).toHaveLength(3));
    await settle();

    expect(toast.error).not.toHaveBeenCalled();
  });
});
