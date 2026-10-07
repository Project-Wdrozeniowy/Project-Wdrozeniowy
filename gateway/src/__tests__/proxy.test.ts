import http from 'http';
import type { AddressInfo } from 'net';
import request from 'supertest';
import type { Express } from 'express';

/**
 * Runs the real proxy (app.test.ts mocks it) against a stub backend that
 * records what reaches it.
 */
interface Received {
  method?: string;
  url?: string;
  cookie?: string;
}

const BACKEND_SET_COOKIE =
  'refreshToken=rotated; Path=/api/auth; Max-Age=604800; HttpOnly; SameSite=Strict';

let backend: http.Server;
let received: Received;
let app: Express;

beforeAll(async () => {
  backend = http.createServer((req, res) => {
    received = { method: req.method, url: req.url, cookie: req.headers.cookie };
    res.setHeader('Set-Cookie', BACKEND_SET_COOKIE);
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ ok: true }));
  });
  app = await appProxyingTo(await listen(backend));
});

afterAll(async () => {
  await close(backend);
});

function listen(server: http.Server): Promise<number> {
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      resolve((server.address() as AddressInfo).port);
    });
  });
}

function close(server: http.Server): Promise<void> {
  return new Promise((resolve) => {
    server.close(() => {
      resolve();
    });
  });
}

/** config reads BACKEND_URL when it is first imported, so load a fresh app per backend. */
async function appProxyingTo(port: number): Promise<Express> {
  process.env.BACKEND_URL = `http://127.0.0.1:${String(port)}`;
  jest.resetModules();
  return (await import('../app')).default;
}

beforeEach(() => {
  received = {};
});

describe('proxy', () => {
  it('forwards the path with its /api prefix, which the backend serves under', async () => {
    const res = await request(app).get('/api/forum/posts?page=1');

    expect(res.status).toBe(200);
    expect(received).toMatchObject({ method: 'GET', url: '/api/forum/posts?page=1' });
  });

  it.each(['/api/auth/refresh', '/api/auth/logout'])(
    'passes the refresh cookie through %s unchanged in both directions',
    async (path) => {
      const res = await request(app)
        .post(path)
        .set('Origin', 'http://localhost:3001')
        .set('Cookie', 'refreshToken=current');

      expect(received).toMatchObject({ method: 'POST', url: path, cookie: 'refreshToken=current' });
      expect(res.headers['set-cookie']).toEqual([BACKEND_SET_COOKIE]);
    }
  );
});

describe('proxy without a reachable backend', () => {
  it('answers 502', async () => {
    const gone = http.createServer();
    const port = await listen(gone);
    await close(gone);

    const res = await request(await appProxyingTo(port)).get('/api/forum/posts');

    expect(res.status).toBe(502);
  });
});
