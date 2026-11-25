import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import type { AxiosInstance } from 'axios';
import MockAdapter from 'axios-mock-adapter';
import type { ReactNode } from 'react';
import { vi } from 'vitest';
import { apiClient } from '@/shared/api/client/api';
import { OPENING_RETRIES, OPENING_RETRY_DELAYS_MS } from '@/shared/api/forum/postOpening.const';
import { useRecordPostOpening } from '@/shared/api/forum/useRecordPostOpening';

/** The real waits between the tries of one opening (the other tests make them zero). */

const axiosInstance = (apiClient as unknown as { client: AxiosInstance }).client;
let mock: MockAdapter;

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>;
}

const sent = () => mock.history.post.filter((request) => /\/openings$/.test(request.url ?? ''));
const advance = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms));

beforeEach(() => {
  vi.useFakeTimers();
  mock = new MockAdapter(axiosInstance);
  apiClient.clearCsrf();
  mock.onGet('/auth/csrf').reply(200, { token: 'csrf', headerName: 'X-CSRF-TOKEN' });
  mock.onPost(/\/openings$/).reply(503);
});
afterEach(() => {
  mock.restore();
  vi.useRealTimers();
});

describe('the waits between the tries of a failed opening', () => {
  it('are the first delay, then the second, and then it is let go', async () => {
    const [first, second] = OPENING_RETRY_DELAYS_MS;
    renderHook(() => useRecordPostOpening('a', true), { wrapper });

    await advance(0);
    expect(sent()).toHaveLength(1);
    await advance(first - 1);
    expect(sent()).toHaveLength(1);
    await advance(1);
    expect(sent()).toHaveLength(2);
    await advance(second - 1);
    expect(sent()).toHaveLength(2);
    await advance(1);
    expect(sent()).toHaveLength(1 + OPENING_RETRIES);
    await advance(60_000);
    expect(sent()).toHaveLength(1 + OPENING_RETRIES);
  });
});
