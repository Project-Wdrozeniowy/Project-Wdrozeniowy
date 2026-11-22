import { QueryClient } from '@tanstack/react-query';
import { vi } from 'vitest';
import {
  authenticateSession,
  reconcileSession,
  sessionRevoked,
  signOutSession,
  observeSessionChanges,
} from '@/shared/auth/session';
import { sessionEvents } from '@/shared/auth/sessionEvents';
import { currentUserQueryKey } from '@/shared/api/profile/currentUser';
import { useStore } from '@/store';
import { currentProfile, logout } from '@/shared/api/generated/orbita.api';

vi.mock('@/shared/api/generated/orbita.api', () => ({
  currentProfile: vi.fn(),
  logout: vi.fn(),
  getCurrentProfileQueryKey: () => ['/users/me'],
  useCurrentProfile: vi.fn(),
}));
vi.mock('@/shared/api/client/api', () => ({
  apiClient: {
    clearCsrf: vi.fn(),
    csrfToken: vi.fn().mockResolvedValue({}),
    setUnauthorizedHandler: vi.fn(),
  },
}));

const alice = { id: 1, username: 'alice' } as Awaited<ReturnType<typeof currentProfile>>;
const bob = { ...alice, id: 2, username: 'bob' };

// The session code keeps the signed-in user's profile in the query cache it is bound to, as
// AuthProvider binds the app's. The store holds only the lifecycle.
let client: QueryClient;
let stopObserving: () => void;
const cached = () => client.getQueryData<typeof alice>(currentUserQueryKey);
function signIn(user: typeof alice) {
  client.setQueryData(currentUserQueryKey, user);
  useStore.getState().setAuthenticated();
}

beforeEach(() => {
  vi.stubGlobal('BroadcastChannel', undefined);
  vi.clearAllMocks();
  sessionEvents.advance();
  useStore.getState().logout();
  vi.mocked(logout).mockResolvedValue(undefined);
  client = new QueryClient();
  stopObserving = observeSessionChanges(client);
});

afterEach(() => stopObserving());

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
  expect(useStore.getState().isAuthenticated).toBe(false);
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
  expect(cached()?.username).toBe('bob');
});

it('profile failure after successful authentication preserves the original error and never repeats the mutation', async () => {
  const failure = new Error('upstream unavailable');
  const mutation = vi.fn().mockResolvedValue(undefined);
  vi.mocked(currentProfile).mockRejectedValue(failure);
  await expect(authenticateSession(mutation)).rejects.toBe(failure);
  expect(mutation).toHaveBeenCalledTimes(1);
  expect(useStore.getState().sessionStatus).toBe('error');
});

const rejectedLogin = {
  isAxiosError: true,
  config: { method: 'post', url: '/auth/login' },
  response: { status: 401 },
};

it('checks the existing cookie after rejected credentials from an authenticated tab', async () => {
  signIn(alice);
  vi.mocked(currentProfile).mockResolvedValue(bob);
  await expect(authenticateSession(vi.fn().mockRejectedValue(rejectedLogin))).rejects.toBe(
    rejectedLogin
  );
  expect(useStore.getState()).toMatchObject({ sessionStatus: 'authenticated' });
  expect(cached()).toEqual(bob);
});

it('ignores an older rejection when a newer login completes', async () => {
  let reject!: (reason: unknown) => void;
  const first = authenticateSession(
    () =>
      new Promise((_, fail) => {
        reject = fail;
      })
  );
  vi.mocked(currentProfile).mockResolvedValue(bob);
  await authenticateSession(vi.fn().mockResolvedValue(undefined));
  reject(rejectedLogin);
  expect(await first).toBeUndefined();
  expect(useStore.getState()).toMatchObject({ sessionStatus: 'authenticated' });
  expect(cached()).toEqual(bob);
});

it('ignores an older rejection if the identity changes during its profile check', async () => {
  useStore.getState().setSessionStatus('error');
  let finish!: (user: typeof alice) => void;
  vi.mocked(currentProfile).mockReturnValueOnce(
    new Promise((resolve) => {
      finish = resolve;
    })
  );
  const first = authenticateSession(vi.fn().mockRejectedValue(rejectedLogin));
  await vi.waitFor(() => expect(currentProfile).toHaveBeenCalled());
  vi.mocked(currentProfile).mockResolvedValue(bob);
  await authenticateSession(vi.fn().mockResolvedValue(undefined));
  finish(alice);
  expect(await first).toBeUndefined();
  expect(useStore.getState()).toMatchObject({ sessionStatus: 'authenticated' });
  expect(cached()).toEqual(bob);
});

it('does not claim logout succeeded after an ambiguous network result', async () => {
  signIn(alice);
  vi.mocked(logout).mockRejectedValue(new Error('network'));
  await expect(signOutSession()).rejects.toThrow('network');
  expect(useStore.getState().sessionStatus).toBe('error');
  expect(useStore.getState().isAuthenticated).toBe(false);
});

it('successful logout clears the local identity only after the server response', async () => {
  vi.mocked(logout).mockResolvedValue(undefined);
  await signOutSession();
  expect(useStore.getState().sessionStatus).toBe('guest');
});

it('keeps the current page and draft mounted during a focus check of the same session', async () => {
  signIn(alice);
  let finish!: (user: typeof alice) => void;
  vi.mocked(currentProfile).mockReturnValue(
    new Promise((resolve) => {
      finish = resolve;
    })
  );
  try {
    const generation = sessionEvents.current();
    window.dispatchEvent(new Event('focus'));
    expect(useStore.getState().sessionStatus).toBe('authenticated');
    expect(cached()).toEqual(alice);
    expect(sessionEvents.current()).toBe(generation);
    finish(alice);
    await vi.waitFor(() => expect(cached()).toEqual(alice));
  } finally {
    // nothing to undo: the observer of this test is stopped after it
  }
});

it('a focus check does not cancel or supersede an explicit login still in flight', async () => {
  let finish!: () => void;
  const mutation = vi.fn().mockReturnValue(
    new Promise<void>((resolve) => {
      finish = resolve;
    })
  );
  vi.mocked(currentProfile).mockResolvedValue(bob);
  const pending = authenticateSession(mutation);
  const generation = sessionEvents.current();
  await reconcileSession(true);
  expect(currentProfile).not.toHaveBeenCalled();
  expect(sessionEvents.current()).toBe(generation);
  finish();
  await expect(pending).resolves.toEqual(bob);
});

it('a focus check invalidates old work when it discovers another account or confirmed expiry', async () => {
  signIn(alice);
  let generation = sessionEvents.current();
  vi.mocked(currentProfile).mockResolvedValue(bob);
  await reconcileSession(true);
  expect(cached()).toEqual(bob);
  expect(sessionEvents.current()).toBeGreaterThan(generation);
  generation = sessionEvents.current();
  vi.mocked(currentProfile).mockRejectedValue({ isAxiosError: true, response: { status: 401 } });
  await reconcileSession(true);
  expect(useStore.getState().sessionStatus).toBe('guest');
  expect(sessionEvents.current()).toBeGreaterThan(generation);
});

it('reconciles a cross-tab signal without Web Locks or BroadcastChannel', async () => {
  vi.mocked(currentProfile).mockResolvedValue(bob);
  window.dispatchEvent(
    new StorageEvent('storage', {
      key: 'orbita-session-change',
      newValue: JSON.stringify({ type: 'settled' }),
    })
  );
  await vi.waitFor(() => expect(cached()?.username).toBe('bob'));
});

it('hides the old identity while another tab changes it', () => {
  signIn(alice);
  window.dispatchEvent(
    new StorageEvent('storage', {
      key: 'orbita-session-change',
      newValue: JSON.stringify({ type: 'changing' }),
    })
  );
  expect(useStore.getState().isAuthenticated).toBe(false);
  expect(useStore.getState().sessionStatus).toBe('checking');
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
  stopObserving();
  stopObserving = observeSessionChanges(client);
  try {
    await authenticateSession(vi.fn().mockResolvedValue(undefined));
    expect(factory).toHaveBeenCalledTimes(1);
    expect(postMessage.mock.calls.map(([message]) => message.type)).toEqual([
      'changing',
      'settled',
    ]);
    expect(cached()).toEqual(alice);
    receiver.onmessage?.(new MessageEvent('message', { data: { type: 'changing' } }));
    // The identity is hidden at once: nobody is signed in while another tab changes it.
    expect(useStore.getState().isAuthenticated).toBe(false);
    vi.mocked(currentProfile).mockResolvedValue(bob);
    receiver.onmessage?.(new MessageEvent('message', { data: { type: 'settled' } }));
    await vi.waitFor(() => expect(cached()).toEqual(bob));
  } finally {
    stopObserving();
  }
  expect(close).toHaveBeenCalledOnce();
});

describe('the profile in the cache and an account switch', () => {
  const perUser = ['/notifications', { page: 0 }] as const;

  it('puts the confirmed profile in the cache, where every screen reads it, and marks the session', async () => {
    vi.mocked(currentProfile).mockResolvedValue(alice);
    await reconcileSession();

    expect(cached()).toEqual(alice);
    expect(useStore.getState()).toMatchObject({
      isAuthenticated: true,
      sessionStatus: 'authenticated',
    });
    // The store holds the lifecycle only: there is no second copy of the profile.
    expect(useStore.getState()).not.toHaveProperty('user');
  });

  it('drops everything cached for the previous account when another one takes over', async () => {
    signIn(alice);
    client.setQueryData(perUser, 'alice private notifications');
    vi.mocked(currentProfile).mockResolvedValue(bob);

    await reconcileSession(true);

    expect(cached()).toEqual(bob);
    expect(client.getQueryData(perUser)).toBeUndefined();
  });

  it('drops it also when the new account signs in through the form over the old one', async () => {
    signIn(alice);
    client.setQueryData(perUser, 'alice private notifications');
    vi.mocked(currentProfile).mockResolvedValue(bob);

    await authenticateSession(vi.fn().mockResolvedValue(undefined));

    expect(cached()).toEqual(bob);
    expect(client.getQueryData(perUser)).toBeUndefined();
  });

  it('keeps what is cached when the same account is confirmed again, and takes its newer profile', async () => {
    signIn(alice);
    client.setQueryData(perUser, 'alice private notifications');
    vi.mocked(currentProfile).mockResolvedValue({ ...alice, displayName: 'Alice A.' });

    await reconcileSession(true);

    expect(cached()).toEqual({ ...alice, displayName: 'Alice A.' });
    expect(client.getQueryData(perUser)).toBe('alice private notifications');
  });

  it('shows nobody once the session is confirmed gone, whatever the cache still holds', async () => {
    signIn(alice);
    vi.mocked(currentProfile).mockRejectedValue({ isAxiosError: true, response: { status: 401 } });

    await reconcileSession(true);

    // The app clears the cache on this transition (QueryProvider); the guarantee that matters here
    // is that the lifecycle says nobody is signed in, which every reader checks first.
    expect(useStore.getState()).toMatchObject({ isAuthenticated: false, sessionStatus: 'guest' });
  });

  it('fails loudly, instead of dropping the profile, when no cache is bound', async () => {
    stopObserving();
    vi.mocked(currentProfile).mockResolvedValue(alice);

    await expect(authenticateSession(vi.fn().mockResolvedValue(undefined))).rejects.toThrow(
      /session cache is not bound/
    );
    stopObserving = observeSessionChanges(client);
  });

  it('reports a missing binding as itself, not as a failed session check, and starts nothing', async () => {
    stopObserving();
    useStore.getState().setSessionStatus('guest');
    const mutation = vi.fn().mockResolvedValue(undefined);

    await expect(reconcileSession()).rejects.toThrow(/session cache is not bound/);
    await expect(authenticateSession(mutation)).rejects.toThrow(/session cache is not bound/);

    // Nothing was read, nothing was changed, and no "could not verify your session" state was made.
    expect(currentProfile).not.toHaveBeenCalled();
    expect(mutation).not.toHaveBeenCalled();
    expect(useStore.getState().sessionStatus).toBe('guest');
    stopObserving = observeSessionChanges(client);
  });
});
