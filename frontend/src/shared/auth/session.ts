import type { QueryClient } from '@tanstack/react-query';
import { currentProfile, logout } from '@/shared/api/generated/orbita.api';
import type { MyProfileDto } from '@/shared/api/generated/models/myProfileDto.dto';
import { apiClient } from '@/shared/api/client/api';
import { apiErrorStatus, authPostStatus } from '@/shared/api/client/apiError';
import { currentUserQueryKey } from '@/shared/api/profile/currentUser';
import { sessionEvents } from './sessionEvents';
import { useStore } from '@/store';

/**
 * The TanStack Query cache that holds the signed-in user's profile. `AuthProvider` binds the
 * app's client while it is mounted (as it does the unauthorized handler); a session change before
 * that is a programming error, not something to ignore, so it fails instead of dropping the profile.
 */
let userCache: QueryClient | undefined;
function cache(): QueryClient {
  if (!userCache) throw new Error('The session cache is not bound: mount AuthProvider first');
  return userCache;
}

/** The profile of the user in the cache, if the server confirmed one. */
function cachedUser(client: QueryClient): MyProfileDto | undefined {
  return client.getQueryData<MyProfileDto>(currentUserQueryKey);
}

/**
 * The server confirmed this user: put the profile in the cache, then mark the session
 * authenticated, so everything that reads either sees both. When another account took over, what
 * was cached for the previous one is dropped first, so it is never shown to the next.
 */
function establishUser(client: QueryClient, user: MyProfileDto) {
  // In the app `begin()` has already hidden the old identity and `QueryProvider` has already cleared
  // the cache, so this is a second safeguard: it also holds with no provider, and for any way of
  // establishing a user that did not go through `begin()`.
  const previous = cachedUser(client);
  if (previous && previous.id !== user.id) {
    void client.cancelQueries();
    client.clear();
  }
  client.setQueryData(currentUserQueryKey, user);
  useStore.getState().setAuthenticated();
}

const CHANNEL = 'orbita-session-change';
let channel: BroadcastChannel | undefined;
let pendingAuthMutations = 0;
function publish(type: 'changing' | 'settled') {
  const message = { type, nonce: Math.random() };
  if (typeof BroadcastChannel !== 'undefined') {
    channel ??= new BroadcastChannel(CHANNEL);
    channel.postMessage(message);
  } else if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(CHANNEL, JSON.stringify(message));
    } catch {
      /* Focus reconciliation remains available. */
    }
  }
}

function begin() {
  const generation = sessionEvents.advance();
  apiClient.clearCsrf();
  useStore.getState().setSessionStatus('checking');
  return generation;
}

export async function reconcileSession(background = false) {
  // Asked first, outside every `try` below: a missing binding is a programming error and must
  // surface as itself, not be taken for a failed session check.
  const client = cache();
  if (background && pendingAuthMutations > 0) return;
  // A focus check must not unmount the current account's form while its session is still valid.
  const generation = background ? sessionEvents.current() : begin();
  await readSession(client, generation, background);
}

async function readSession(client: QueryClient, generation: number, background: boolean) {
  const { controller, release } = sessionEvents.controller();
  try {
    const user = await currentProfile({
      signal: controller.signal,
      skipErrorToast: true,
      skipUnauthorizedHandler: true,
    });
    if (generation === sessionEvents.current()) {
      if (background && cachedUser(client)?.id !== user.id) begin();
      establishUser(client, user);
    }
  } catch (error) {
    if (generation === sessionEvents.current()) {
      if (background && useStore.getState().isAuthenticated) begin();
      useStore.getState().setSessionStatus(apiErrorStatus(error) === 401 ? 'guest' : 'error');
    }
  } finally {
    release();
  }
}

/** Executes one explicit auth mutation; a failed profile read never repeats the mutation. */
export async function authenticateSession(mutation: (signal: AbortSignal) => Promise<unknown>) {
  const client = cache();
  const wasGuest = useStore.getState().sessionStatus === 'guest';
  const generation = begin();
  publish('changing');
  const { controller, release } = sessionEvents.controller();
  pendingAuthMutations += 1;
  try {
    await mutation(controller.signal);
    apiClient.clearCsrf();
    await apiClient.csrfToken();
    const user = await currentProfile({
      signal: controller.signal,
      skipErrorToast: true,
      skipUnauthorizedHandler: true,
    });
    if (generation !== sessionEvents.current()) return undefined;
    establishUser(client, user);
    return user;
  } catch (error) {
    if (generation !== sessionEvents.current()) return undefined;
    const rejected =
      authPostStatus(error, 'login') === 401 || authPostStatus(error, 'register') === 409;
    if (!rejected) {
      useStore.getState().setSessionStatus('error');
    } else if (wasGuest) {
      useStore.getState().setSessionStatus('guest');
    } else {
      // Rejecting new credentials does not establish the identity of the existing cookie.
      await readSession(client, generation, false);
      if (generation !== sessionEvents.current()) return undefined;
    }
    throw error;
  } finally {
    pendingAuthMutations -= 1;
    release();
    publish('settled');
  }
}

export async function signOutSession() {
  const generation = begin();
  publish('changing');
  pendingAuthMutations += 1;
  try {
    await logout();
    if (generation === sessionEvents.current()) {
      apiClient.clearCsrf();
      useStore.getState().logout();
    }
  } catch (error) {
    if (generation === sessionEvents.current()) useStore.getState().setSessionStatus('error');
    throw error;
  } finally {
    pendingAuthMutations -= 1;
    publish('settled');
  }
}

/** Password change has already revoked server authentication; no second mutation is needed. */
export function sessionRevoked() {
  begin();
  useStore.getState().logout();
  publish('settled');
}

export function observeSessionChanges(client: QueryClient) {
  userCache = client;
  const receive = (message: unknown) => {
    if (!message || typeof message !== 'object' || !('type' in message)) return;
    if (message.type === 'changing') begin();
    if (message.type === 'settled') void reconcileSession();
  };
  let receiver: BroadcastChannel | undefined;
  if (typeof BroadcastChannel !== 'undefined') {
    channel ??= new BroadcastChannel(CHANNEL);
    receiver = channel;
    receiver.onmessage = (event: MessageEvent<unknown>) => receive(event.data);
  }
  const storage = (event: StorageEvent) => {
    if (event.key === CHANNEL && event.newValue) {
      try {
        receive(JSON.parse(event.newValue));
      } catch {
        /* Ignore unrelated malformed events. */
      }
    }
  };
  const focus = () => {
    void reconcileSession(true);
  };
  window.addEventListener('storage', storage);
  window.addEventListener('focus', focus);
  apiClient.setUnauthorizedHandler(() => {
    begin();
    useStore.getState().logout();
  });
  return () => {
    sessionEvents.advance();
    if (userCache === client) userCache = undefined;
    receiver?.close();
    if (channel === receiver) channel = undefined;
    window.removeEventListener('storage', storage);
    window.removeEventListener('focus', focus);
    apiClient.setUnauthorizedHandler(undefined);
  };
}
