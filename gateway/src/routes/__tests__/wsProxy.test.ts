import http from 'http';
import type { AddressInfo } from 'net';
import express from 'express';
import request from 'supertest';

// Transport boundary only. STOMP authentication/delivery remains provisional
// under PWDRZ-104; this test does not certify a live messaging contract.
it('terminates an HTTP/SockJS request with 502 when the upstream is unavailable', async () => {
  const server = http.createServer();
  const port = await new Promise<number>((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      resolve((server.address() as AddressInfo).port);
    });
  });
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });

  const previousBackend = process.env.BACKEND_URL;
  const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  try {
    process.env.BACKEND_URL = `http://127.0.0.1:${String(port)}`;
    jest.resetModules();
    const proxy = (await import('../wsProxy')).default;
    const app = express();
    app.use(proxy);

    const response = await request(app).get('/ws/info').timeout(3000);

    expect(response.status).toBe(502);
    expect(response.headers['content-type']).toContain('application/json');
    expect(response.body).toEqual({ error: 'Backend unavailable' });
    expect(consoleError).toHaveBeenCalled();

    expect((await request(app).get('/ws')).status).toBe(502);
    expect((await request(app).get('/ws-other')).status).toBe(404);
  } finally {
    if (previousBackend === undefined) {
      delete process.env.BACKEND_URL;
    } else {
      process.env.BACKEND_URL = previousBackend;
    }
    consoleError.mockRestore();
  }
});
