import { render, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, beforeEach, expect, it } from 'vitest';
import NotificationProvider from '../NotificationProvider';
import {
  startNotificationStream,
  type StreamActions,
} from '@/shared/api/websocket/notificationStream';
import { sessionEvents } from '@/shared/auth/sessionEvents';
import { useStore } from '@/store';
import { apiClient } from '@/shared/api/client/api';

vi.mock('@/shared/api/websocket/notificationStream', () => ({
  startNotificationStream: vi.fn(() => vi.fn()),
}));
vi.mock('@/shared/api/client/api', () => ({
  apiClient: {
    csrfToken: vi.fn().mockResolvedValue({ token: 'token', headerName: 'X-CSRF-TOKEN' }),
    get: vi.fn().mockResolvedValue({}),
  },
}));

beforeEach(() => {
  sessionEvents.advance();
  useStore.getState().logout();
  vi.clearAllMocks();
});
function mount() {
  const cache = new QueryClient();
  const view = render(
    <QueryClientProvider client={cache}>
      <NotificationProvider />
    </QueryClientProvider>
  );
  return { ...view, cache };
}
it('does not connect a guest and tears down synchronously on a session generation change', () => {
  const view = mount();
  expect(startNotificationStream).not.toHaveBeenCalled();
  act(() => useStore.getState().setAuthenticated());
  const actions = vi.mocked(startNotificationStream).mock.calls[0][0];
  expect(actions.signal.aborted).toBe(false);
  act(() => sessionEvents.advance());
  expect(actions.signal.aborted).toBe(true);
  view.unmount();
  expect(vi.mocked(startNotificationStream).mock.results[0].value).toHaveBeenCalled();
});
it('uses the existing CSRF/cache transport and offers session recovery after a protocol refusal', async () => {
  useStore.getState().setAuthenticated();
  const view = mount();
  const actions: StreamActions = vi.mocked(startNotificationStream).mock.calls[0][0];
  const invalidate = vi.spyOn(view.cache, 'invalidateQueries');
  await actions.csrf();
  await actions.probe();
  await actions.refresh();
  expect(apiClient.csrfToken).toHaveBeenCalled();
  expect(apiClient.get).toHaveBeenCalledWith(
    '/ws/info',
    expect.objectContaining({ baseURL: '', skipErrorToast: true })
  );
  expect(invalidate).toHaveBeenCalledWith(
    expect.objectContaining({ queryKey: ['/notifications'] }),
    undefined
  );
  act(() => actions.protocolFailure());
  expect(useStore.getState().sessionStatus).toBe('error');
  expect(actions.signal.aborted).toBe(true);
  view.unmount();
});
