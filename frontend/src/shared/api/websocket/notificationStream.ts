import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { z } from 'zod';

export interface StreamActions {
  refresh: () => Promise<unknown>;
  csrf: () => Promise<{ headerName: string; token: string }>;
  probe: () => Promise<unknown>;
  protocolFailure: () => void;
  signal: AbortSignal;
}

export function startNotificationStream(actions: StreamActions): () => void {
  let stopped = false;
  let dirty = false;
  let reading = false;
  let failures = 0;
  const active = () => !stopped && !actions.signal.aborted;
  async function refresh() {
    dirty = true;
    if (reading) return;
    reading = true;
    try {
      while (dirty && active()) {
        dirty = false;
        await actions.refresh();
      }
    } catch {
      // The existing notification query owns its accessible retry/error state.
    } finally {
      reading = false;
    }
  }
  const client = new Client({
    webSocketFactory: () =>
      new SockJS('/ws', undefined, {
        transports: ['websocket', 'xhr-streaming', 'xhr-polling'],
      }),
    reconnectDelay: 1000,
    connectionTimeout: 10000,
    heartbeatIncoming: 10000,
    heartbeatOutgoing: 10000,
    // Never print STOMP headers or private frame bodies.
    debug: () => {},
    logRawCommunication: false,
  });
  client.beforeConnect = async () => {
    try {
      const csrf = await actions.csrf();
      if (active()) client.connectHeaders = { [csrf.headerName]: csrf.token };
      else stop();
    } catch {
      if (active()) {
        stop();
        actions.protocolFailure();
      }
    }
  };
  client.onConnect = () => {
    if (!active()) return;
    failures = 0;
    client.subscribe('/user/queue/notifications', (message) => {
      if (!active()) return;
      try {
        if (streamMessage.safeParse(JSON.parse(message.body)).success) void refresh();
      } catch {
        /* Invalid/unknown frames cannot enter the cache. */
      }
    });
  };
  client.onWebSocketClose = () => {
    if (!active()) return;
    client.reconnectDelay =
      Math.min(30000, 1000 * 2 ** Math.min(failures++, 5)) * (0.8 + Math.random() * 0.4);
    // /ws/info checks authentication without touching idle, including after a failed Upgrade.
    void actions.probe().catch(() => {});
  };
  client.onStompError = () => {
    if (active()) {
      stop();
      actions.protocolFailure();
    }
  };
  function stop() {
    if (stopped) return;
    stopped = true;
    dirty = false;
    actions.signal.removeEventListener('abort', stop);
    void client.deactivate({ force: true });
  }
  actions.signal.addEventListener('abort', stop, { once: true });
  if (active()) client.activate();
  return stop;
}
// Separate non-REST wire contract owned by backend NotificationCreatedEvent, with shared contract fixtures.
const streamMessage = z.discriminatedUnion('type', [
  z.object({ version: z.literal(1), type: z.literal('stream.ready') }),
  z
    .object({
      version: z.literal(1),
      type: z.literal('notification.created'),
      eventId: z.string(),
      notificationId: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
    })
    .refine((event) => event.eventId === `notification.created:${event.notificationId}`),
]);
