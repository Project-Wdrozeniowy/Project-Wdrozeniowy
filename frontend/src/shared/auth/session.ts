import { currentProfile, logout } from '@/shared/api/generated/orbita.api';
import { apiClient } from '@/shared/api/client/api';
import { apiErrorStatus, authPostStatus } from '@/shared/api/client/apiError';
import { sessionEvents } from './sessionEvents';
import { useStore } from '@/store';

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
  if (background && pendingAuthMutations > 0) return;
  // A focus check must not unmount the current account's form while its session is still valid.
  const generation = background ? sessionEvents.current() : begin();
  await readSession(generation, background);
}

async function readSession(generation: number, background: boolean) {
  const { controller, release } = sessionEvents.controller();
  try {
    const user = await currentProfile({
      signal: controller.signal,
      skipErrorToast: true,
      skipUnauthorizedHandler: true,
    });
    if (generation === sessionEvents.current()) {
      if (background && useStore.getState().user?.id !== user.id) begin();
      useStore.getState().setAuth(user);
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
    useStore.getState().setAuth(user);
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
      await readSession(generation, false);
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

export function observeSessionChanges() {
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
    receiver?.close();
    if (channel === receiver) channel = undefined;
    window.removeEventListener('storage', storage);
    window.removeEventListener('focus', focus);
    apiClient.setUnauthorizedHandler(undefined);
  };
}
