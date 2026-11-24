import { beforeEach, describe, expect, it, vi } from 'vitest';
import { startNotificationStream } from '../notificationStream';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

interface FakeClient {
  beforeConnect: () => Promise<void>;
  connectHeaders: Record<string, string>;
  onConnect: () => void;
  onWebSocketClose: () => void;
  onStompError: () => void;
  receive: (message: { body: string }) => void;
  subscribe: ReturnType<typeof vi.fn>;
  deactivate: ReturnType<typeof vi.fn>;
}
const fake = vi.hoisted(() => ({ clients: [] as FakeClient[] }));
vi.mock('@stomp/stompjs', () => ({
  Client: class {
    onConnect?: () => void;
    beforeConnect?: () => Promise<void>;
    connectHeaders = {};
    subscribe = vi.fn((_destination, callback) => {
      this.receive = callback;
      return { unsubscribe: vi.fn() };
    });
    receive?: (message: { body: string }) => void;
    activate = vi.fn();
    deactivate = vi.fn().mockResolvedValue(undefined);
    constructor(options: object) {
      Object.assign(this, options);
      fake.clients.push(this as unknown as FakeClient);
    }
  },
}));
vi.mock('sockjs-client', () => ({ default: class {} }));

describe('notification stream', () => {
  it('accepts the backend-owned version-one contract fixture', async () => {
    const { actions, client } = setup();
    client.onConnect();
    client.receive({
      body: readFileSync(
        resolve(
          process.cwd(),
          '../backend/src/test/resources/contracts/notification-created.v1.json'
        ),
        'utf8'
      ),
    });
    await vi.waitFor(() => expect(actions.refresh).toHaveBeenCalledOnce());
  });
  beforeEach(() => {
    fake.clients.length = 0;
  });
  function setup() {
    const controller = new AbortController();
    const actions = {
      refresh: vi.fn().mockResolvedValue(undefined),
      csrf: vi.fn().mockResolvedValue({ headerName: 'X-CSRF-TOKEN', token: 'csrf' }),
      probe: vi.fn().mockResolvedValue(undefined),
      protocolFailure: vi.fn(),
      signal: controller.signal,
    };
    const stop = startNotificationStream(actions);
    return { actions, controller, stop, client: fake.clients[0] };
  }
  it('subscribes only to the personal queue and reconciles after actual subscription readiness', async () => {
    const { actions, client } = setup();
    expect(client).toBeDefined();
    await client.beforeConnect();
    expect(client.connectHeaders).toEqual({ 'X-CSRF-TOKEN': 'csrf' });
    client.onConnect();
    expect(client.subscribe).toHaveBeenCalledWith(
      '/user/queue/notifications',
      expect.any(Function)
    );
    expect(actions.refresh).not.toHaveBeenCalled();
    client.receive({ body: '{"version":1,"type":"stream.ready"}' });
    await vi.waitFor(() => expect(actions.refresh).toHaveBeenCalledTimes(1));
  });
  it('reconciles again for an event during an in-flight read and ignores stale callbacks', async () => {
    const { actions, client, controller, stop } = setup();
    expect(client).toBeDefined();
    let finish!: () => void;
    actions.refresh.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        })
    );
    client.onConnect();
    client.receive({ body: '{"version":1,"type":"stream.ready"}' });
    client.receive({
      body: '{"version":1,"type":"notification.created","eventId":"notification.created:9","notificationId":9}',
    });
    expect(actions.refresh).toHaveBeenCalledTimes(1);
    finish();
    await vi.waitFor(() => expect(actions.refresh).toHaveBeenCalledTimes(2));
    controller.abort();
    client.receive({ body: '{"version":1,"type":"stream.ready"}' });
    stop();
    expect(actions.refresh).toHaveBeenCalledTimes(2);
    expect(client.deactivate).toHaveBeenCalled();
  });
  it('rejects malformed, unknown-version and mismatched event identities', () => {
    const { actions, client } = setup();
    expect(client).toBeDefined();
    client.onConnect();
    for (const body of [
      'oops',
      '{"version":2,"type":"stream.ready"}',
      '{"version":1,"type":"notification.created","eventId":"wrong","notificationId":9}',
    ])
      client.receive({ body });
    expect(actions.refresh).not.toHaveBeenCalled();
  });
  it('checks transport authentication after a close and stops after a protocol error', async () => {
    const { actions, client } = setup();
    client.onWebSocketClose();
    expect(actions.probe).toHaveBeenCalledOnce();
    client.onStompError();
    expect(actions.protocolFailure).toHaveBeenCalledOnce();
    client.onStompError();
    client.onWebSocketClose();
    expect(actions.protocolFailure).toHaveBeenCalledOnce();
    await client.beforeConnect();
    expect(client.deactivate).toHaveBeenCalled();
  });
  it('handles failed CSRF/read/probe without replaying or keeping retrying authentication', async () => {
    const { actions, client } = setup();
    actions.probe.mockRejectedValue(new Error('offline'));
    client.onWebSocketClose();
    actions.refresh.mockRejectedValue(new Error('offline'));
    client.onConnect();
    client.receive({ body: '{"version":1,"type":"stream.ready"}' });
    await Promise.resolve();
    actions.csrf.mockRejectedValue(new Error('csrf unavailable'));
    await client.beforeConnect();
    expect(actions.protocolFailure).toHaveBeenCalledOnce();
    expect(client.deactivate).toHaveBeenCalled();
  });
});
