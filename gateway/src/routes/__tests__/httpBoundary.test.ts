import http from 'node:http';
import type { AddressInfo } from 'node:net';
import request from 'supertest';
import type { Express } from 'express';

let server: http.Server;
let app: Express;
let mode = 'echo';
let received: { method?: string; url?: string; body?: string; headers?: http.IncomingHttpHeaders };

beforeAll(async () => {
  server = http.createServer((req, res) => {
    if (mode === 'hang') {
      return;
    }
    if (mode === 'partial') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.write('{"partial":');
      setTimeout(() => res.destroy(), 15);
      return;
    }
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => {
      received = {
        method: req.method,
        url: req.url,
        body: Buffer.concat(chunks).toString(),
        headers: req.headers,
      };
      res.setHeader('Set-Cookie', [
        'SESSION=opaque; Path=/; HttpOnly; SameSite=Strict',
        'refreshToken=; Path=/api/auth; Max-Age=0; HttpOnly',
      ]);
      res.setHeader('X-Backend-Header', 'preserved');
      res.writeHead(201, { 'Content-Type': 'application/json' });
      res.end('{"ok":true}');
    });
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  process.env.BACKEND_URL = `http://127.0.0.1:${String((server.address() as AddressInfo).port)}`;
  process.env.UPSTREAM_TIMEOUT_MS = '200';
  process.env.BODY_TIMEOUT_MS = '200';
  process.env.LOGIN_RATE_LIMIT_MAX = '2';
  process.env.CSRF_RATE_LIMIT_MAX = '2';
  jest.resetModules();
  app = (await import('../../app')).createApp();
});

afterAll(async () => {
  server.closeAllConnections();
  await new Promise<void>((resolve) =>
    server.close(() => {
      resolve();
    })
  );
  for (const key of [
    'BACKEND_URL',
    'UPSTREAM_TIMEOUT_MS',
    'BODY_TIMEOUT_MS',
    'LOGIN_RATE_LIMIT_MAX',
    'CSRF_RATE_LIMIT_MAX',
  ]) {
    Reflect.deleteProperty(process.env, key);
  }
});
beforeEach(() => {
  mode = 'echo';
  received = {};
});

it.each(['post', 'put', 'patch', 'delete'] as const)(
  'preserves %s path/query, raw JSON, cookies, CSRF, status and multiple cookies',
  async (method) => {
    const raw = '{"content":"Unicode: żółć 😀 \\u0000","categoryId":1}';
    const result = await request(app)
      [method]('/api/forum/posts?tag=a%2Fb&page=2')
      .set('Content-Type', 'application/json')
      .set('Cookie', 'SESSION=opaque')
      .set('X-CSRF-TOKEN', 'csrf')
      .send(raw);
    expect(result.status).toBe(201);
    expect(received).toMatchObject({
      method: method.toUpperCase(),
      url: '/api/forum/posts?tag=a%2Fb&page=2',
      body: raw,
    });
    expect(received.headers?.cookie).toBe('SESSION=opaque');
    expect(received.headers?.['x-csrf-token']).toBe('csrf');
    expect(result.headers['set-cookie']).toHaveLength(2);
    expect(result.headers['x-backend-header']).toBe('preserved');
  }
);

it('accepts the worst-case escaped content allowed by the implemented post DTO', async () => {
  const body = JSON.stringify({
    title: 't'.repeat(255),
    content: '\u0001'.repeat(100000),
    categoryId: 1,
    tags: Array.from({ length: 10 }, (_, i) => `${String(i)}${'a'.repeat(49)}`),
  });
  expect(Buffer.byteLength(body)).toBeLessThan(1048576);
  const result = await request(app)
    .post('/api/forum/posts')
    .set('Content-Type', 'application/json')
    .send(body);
  expect(result.status).toBe(201);
  expect(received.body).toBe(body);
});

it('rejects an oversized raw body before the upstream sees it', async () => {
  const result = await request(app)
    .post('/api/forum/posts')
    .set('Content-Type', 'application/json')
    .send('x'.repeat(1048577));
  expect(result.status).toBe(413);
  expect((result.body as { detail: string }).detail).toBe('Request body too large');
  expect(received.method).toBeUndefined();
});

it('times out an incomplete request body before opening an upstream mutation', async () => {
  const edge = http.createServer(app);
  await new Promise<void>((resolve) => edge.listen(0, '127.0.0.1', resolve));
  try {
    const status = await new Promise<number>((resolve, reject) => {
      const incoming = http.request(
        {
          host: '127.0.0.1',
          port: (edge.address() as AddressInfo).port,
          path: '/api/forum/posts',
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Content-Length': '1000' },
        },
        (response) => {
          response.resume();
          response.on('end', () => {
            incoming.destroy();
            resolve(response.statusCode ?? 0);
          });
        }
      );
      incoming.on('error', reject);
      incoming.write('{');
    });
    expect(status).toBe(408);
    expect(received.method).toBeUndefined();
  } finally {
    edge.closeAllConnections();
    await new Promise<void>((resolve) => {
      edge.close(() => {
        resolve();
      });
    });
  }
});

it('rejects unsupported content encodings safely', async () => {
  const result = await request(app)
    .post('/api/forum/posts')
    .set('Content-Type', 'application/json')
    .set('Content-Encoding', 'gzip')
    .send('body');
  expect(result.status).toBe(415);
  expect(received.method).toBeUndefined();
});

it('rebuilds forwarding information and drops forged identity headers', async () => {
  await request(app)
    .get('/api/forum/posts')
    .set('X-Forwarded-For', '203.0.113.1')
    .set('X-Forwarded-Proto', 'https')
    .set('Forwarded', 'for=attacker')
    .set('X-User-Id', 'administrator')
    .set('X-Authenticated-User', 'administrator');
  expect(received.headers?.forwarded).toBeUndefined();
  expect(received.headers?.['x-user-id']).toBeUndefined();
  expect(received.headers?.['x-authenticated-user']).toBeUndefined();
  expect(received.headers?.['x-forwarded-for']).not.toContain('203.0.113.1');
  expect(received.headers?.['x-forwarded-proto']).toBe('http');
});

it('returns 504 for a hanging upstream without replay', async () => {
  mode = 'hang';
  const result = await request(app).post('/api/forum/posts').send({ content: 'body' });
  expect(result.status).toBe(504);
  expect(result.type).toBe('application/problem+json');
});

it('aborts a partial upstream response instead of appending an HTTP error body', async () => {
  mode = 'partial';
  await expect(request(app).get('/api/forum/posts')).rejects.toThrow(/aborted|reset|socket/i);
});

it.each(['/api/auth/login', '/api/auth/csrf'])(
  'bounds %s and ignores forged client addresses',
  async (path) => {
    for (let index = 0; index < 2; index++) {
      const call = path.endsWith('login')
        ? request(app).post(path).send({})
        : request(app).get(path);
      expect((await call.set('X-Forwarded-For', `203.0.113.${String(index)}`)).status).toBe(201);
    }
    const call = path.endsWith('login') ? request(app).post(path).send({}) : request(app).get(path);
    const limited = await call.set('X-Forwarded-For', '203.0.113.99');
    expect(limited.status).toBe(429);
    expect(limited.headers['retry-after']).toBeDefined();
  }
);
