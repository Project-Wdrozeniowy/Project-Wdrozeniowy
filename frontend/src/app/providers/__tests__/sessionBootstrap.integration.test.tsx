import { vi } from 'vitest';
import {
  authenticateSession,
  reconcileSession,
  sessionRevoked,
  signOutSession,
  observeSessionChanges,
} from '@/shared/auth/session';
import { sessionEvents } from '@/shared/auth/sessionEvents';
import { useStore } from '@/store';
import { currentProfile, logout } from '@/shared/api/generated/orbita.api';

vi.mock('@/shared/api/generated/orbita.api', () => ({ currentProfile: vi.fn(), logout: vi.fn() }));
vi.mock('@/shared/api/client/api', () => ({
  apiClient: {
    clearCsrf: vi.fn(),
    csrfToken: vi.fn().mockResolvedValue({}),
    setUnauthorizedHandler: vi.fn(),
  },
}));

const alice = { id: 1, username: 'alice' } as Awaited<ReturnType<typeof currentProfile>>;
const bob = { ...alice, id: 2, username: 'bob' };
beforeEach(() => {
  vi.stubGlobal('BroadcastChannel', undefined);
  vi.clearAllMocks();
  sessionEvents.advance();
  useStore.getState().logout();
  vi.mocked(logout).mockResolvedValue(undefined);
});

it('does not publish a pending bootstrap after logout', async () => {
  let finish!: (user: typeof alice) => void;
  vi.mocked(currentProfile).mockReturnValue(
    new Promise((resolve) => {
      finish = resolve;
    })
  );
  const pending = reconcileSession();
  sessionRevoked();
  finish(alice);
  await pending;
  expect(useStore.getState().sessionStatus).toBe('guest');
  expect(useStore.getState().user).toBeNull();
});

it('a superseded login cannot publish its profile or navigate as the old account', async () => {
  let finish!: (user: typeof alice) => void;
  vi.mocked(currentProfile)
    .mockReturnValueOnce(
      new Promise((resolve) => {
        finish = resolve;
      })
    )
    .mockResolvedValueOnce(bob);
  const first = authenticateSession(vi.fn().mockResolvedValue(undefined));
  await vi.waitFor(() => expect(finish).toBeDefined());
  await authenticateSession(vi.fn().mockResolvedValue(undefined));
  finish(alice);
  expect(await first).toBeUndefined();
  expect(useStore.getState().user?.username).toBe('bob');
});

it('profile failure after successful authentication preserves the original error and never repeats the mutation', async () => {
  const failure = new Error('upstream unavailable');
  const mutation = vi.fn().mockResolvedValue(undefined);
  vi.mocked(currentProfile).mockRejectedValue(failure);
  await expect(authenticateSession(mutation)).rejects.toBe(failure);
  expect(mutation).toHaveBeenCalledTimes(1);
  expect(useStore.getState().sessionStatus).toBe('error');
});

it('does not claim logout succeeded after an ambiguous network result', async () => {
  useStore.getState().setAuth(alice);
  vi.mocked(logout).mockRejectedValue(new Error('network'));
  await expect(signOutSession()).rejects.toThrow('network');
  expect(useStore.getState().sessionStatus).toBe('error');
  expect(useStore.getState().user).toBeNull();
});

it('successful logout clears the local identity only after the server response', async () => {
  vi.mocked(logout).mockResolvedValue(undefined);
  await signOutSession();
  expect(useStore.getState().sessionStatus).toBe('guest');
});

it('keeps the current page and draft mounted during a focus check of the same session', async () => {
  useStore.getState().setAuth(alice);
  let finish!: (user: typeof alice) => void;
  vi.mocked(currentProfile).mockReturnValue(
    new Promise((resolve) => {
      finish = resolve;
    })
  );
  const stop = observeSessionChanges();
  try {
    window.dispatchEvent(new Event('focus'));
    expect(useStore.getState().sessionStatus).toBe('authenticated');
    expect(useStore.getState().user).toEqual(alice);
    finish(alice);
    await vi.waitFor(() => expect(useStore.getState().user).toEqual(alice));
  } finally {
    stop();
  }
});

it('reconciles a cross-tab signal without Web Locks or BroadcastChannel', async () => {
  vi.mocked(currentProfile).mockResolvedValue(bob);
  const stop = observeSessionChanges();
  window.dispatchEvent(
    new StorageEvent('storage', {
      key: 'orbita-session-change',
      newValue: JSON.stringify({ type: 'settled' }),
    })
  );
  await vi.waitFor(() => expect(useStore.getState().user?.username).toBe('bob'));
  stop();
});

it('hides the old identity while another tab changes it', () => {
  useStore.getState().setAuth(alice);
  const stop = observeSessionChanges();
  window.dispatchEvent(
    new StorageEvent('storage', {
      key: 'orbita-session-change',
      newValue: JSON.stringify({ type: 'changing' }),
    })
  );
  expect(useStore.getState().user).toBeNull();
  expect(useStore.getState().sessionStatus).toBe('checking');
  stop();
});

it('uses one BroadcastChannel and reconciles another tab without receiving its own publish', async () => {
  const postMessage = vi.fn();
  const close = vi.fn();
  const receiver = {
    onmessage: null as ((event: MessageEvent) => void) | null,
    postMessage,
    close,
  };
  const factory = vi.fn(function () {
    return receiver;
  });
  vi.stubGlobal('BroadcastChannel', factory);
  vi.mocked(currentProfile).mockResolvedValue(alice);
  const stop = observeSessionChanges();
  try {
    await authenticateSession(vi.fn().mockResolvedValue(undefined));
    expect(factory).toHaveBeenCalledTimes(1);
    expect(postMessage.mock.calls.map(([message]) => message.type)).toEqual([
      'changing',
      'settled',
    ]);
    expect(useStore.getState().user).toEqual(alice);
    receiver.onmessage?.(new MessageEvent('message', { data: { type: 'changing' } }));
    expect(useStore.getState().user).toBeNull();
    vi.mocked(currentProfile).mockResolvedValue(bob);
    receiver.onmessage?.(new MessageEvent('message', { data: { type: 'settled' } }));
    await vi.waitFor(() => expect(useStore.getState().user).toEqual(bob));
  } finally {
    stop();
  }
  expect(close).toHaveBeenCalledOnce();
});
