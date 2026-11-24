import http from 'node:http';
import type { AddressInfo } from 'node:net';
import express from 'express';
import { WebSocket, WebSocketServer } from 'ws';
import request from 'supertest';

it('forwards the first Upgrade and SockJS HTTP paths with the backend context prefix', async () => {
  const upstream = http.createServer((req, res) => {
    let body = '';
    req.on('data', (chunk: Buffer) => {
      body += chunk.toString();
    });
    req.on('end', () => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          path: req.url,
          origin: req.headers.origin,
          cookie: req.headers.cookie,
          ...(body ? { body } : {}),
        })
      );
    });
  });
  const sockets = new WebSocketServer({ server: upstream });
  sockets.on('connection', (socket, req) => {
    socket.send(req.url ?? '');
  });
  await new Promise<void>((resolve) => upstream.listen(0, '127.0.0.1', resolve));
  const previous = process.env.BACKEND_URL;
  process.env.BACKEND_URL = `http://127.0.0.1:${String((upstream.address() as AddressInfo).port)}`;
  jest.resetModules();
  const proxy = (await import('../wsProxy')).default;
  const { createGatewayServer } = await import('../../server');
  const app = express();
  app.use(express.raw({ type: () => true }));
  app.use(proxy);
  const gateway = createGatewayServer(app);
  await new Promise<void>((resolve) => gateway.listen(0, '127.0.0.1', resolve));
  const port = (gateway.address() as AddressInfo).port;
  let client: WebSocket | undefined;
  try {
    // No HTTP middleware invocation precedes this Upgrade.
    const live = new WebSocket(`ws://127.0.0.1:${String(port)}/ws/000/test/websocket`);
    client = live;
    const path = await new Promise<string>((resolve, reject) => {
      live.once('message', (data) => {
        resolve(
          Buffer.isBuffer(data)
            ? data.toString()
            : data instanceof ArrayBuffer
              ? Buffer.from(data).toString()
              : Buffer.concat(data).toString()
        );
      });
      live.once('error', reject);
    });
    expect(path).toBe('/api/ws/000/test/websocket');
    const response = await request(gateway)
      .get('/ws/info')
      .set('Origin', 'http://browser.test')
      .set('Cookie', 'SESSION=opaque');
    expect(response.body).toEqual({
      path: '/api/ws/info',
      origin: 'http://browser.test',
      cookie: 'SESSION=opaque',
    });
    expect((await request(gateway).get('/ws-other')).status).toBe(404);
    expect(
      (
        await request(gateway)
          .post('/ws/000/test/xhr_send')
          .set('Content-Type', 'application/json')
          .send('["SUBSCRIBE"]')
      ).body
    ).toEqual({ path: '/api/ws/000/test/xhr_send', body: '["SUBSCRIBE"]' });
    const rejected = new WebSocket(`ws://127.0.0.1:${String(port)}/ws-other`);
    const status = await new Promise<number>((resolve, reject) => {
      rejected.once('unexpected-response', (_req, res) => {
        resolve(res.statusCode ?? 0);
        rejected.terminate();
      });
      rejected.once('error', reject);
    });
    expect(status).toBe(404);
  } finally {
    client?.terminate();
    sockets.clients.forEach((socket) => {
      socket.terminate();
    });
    await new Promise<void>((resolve) => {
      sockets.close(() => {
        resolve();
      });
    });
    await Promise.all([
      new Promise<void>((resolve) =>
        gateway.close(() => {
          resolve();
        })
      ),
      new Promise<void>((resolve) =>
        upstream.close(() => {
          resolve();
        })
      ),
    ]);
    if (previous === undefined) {
      delete process.env.BACKEND_URL;
    } else {
      process.env.BACKEND_URL = previous;
    }
  }
});
