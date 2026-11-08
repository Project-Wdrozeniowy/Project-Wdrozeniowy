import request from 'supertest';
import express from 'express';
import app from '../app';
import { errorHandler } from '../middleware/errorHandler';

jest.mock('../routes/proxy', () => ({
  __esModule: true,
  default: (_req: express.Request, _res: express.Response, next: express.NextFunction): void => {
    next();
  },
}));

test('health is public and carries security headers', async () => {
  const response = await request(app).get('/health');
  expect(response.status).toBe(200);
  expect(response.body).toEqual({ status: 'ok' });
  expect(response.headers['x-content-type-options']).toBe('nosniff');
});

test.each([undefined, 'Bearer malformed', 'Bearer expired'])(
  'leaves API authentication to Spring: %s',
  async (authorization) => {
    const call = request(app).get('/api/users/me');
    if (authorization) {
      call.set('Authorization', authorization);
    }
    expect((await call).status).toBe(404); // the proxy mock falls through, never a Gateway auth rejection
  }
);

test('CORS allows only configured development origins and the CSRF header', async () => {
  const allowed = await request(app)
    .options('/api/auth/login')
    .set('Origin', 'http://localhost:3001')
    .set('Access-Control-Request-Method', 'POST')
    .set('Access-Control-Request-Headers', 'X-CSRF-TOKEN');
  expect(allowed.headers['access-control-allow-origin']).toBe('http://localhost:3001');
  expect(allowed.headers['access-control-allow-headers']).toContain('X-CSRF-TOKEN');
  const denied = await request(app).get('/health').set('Origin', 'https://untrusted.example');
  expect(denied.headers['access-control-allow-origin']).toBeUndefined();
});

test('unknown API paths remain ProblemDetail with HTML Accept', async () => {
  const response = await request(app).get('/api/unknown').set('Accept', 'text/html');
  expect(response.status).toBe(404);
  expect(response.type).toBe('application/problem+json');
});

test('unexpected errors are masked', async () => {
  const failing = express();
  failing.get('/fail', (_req, _res, next) => {
    next(new Error('private'));
  });
  failing.use(errorHandler);
  const response = await request(failing).get('/fail');
  expect(response.status).toBe(500);
  expect((response.body as { detail: string }).detail).toBe('Internal server error');
});
