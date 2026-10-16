import express from 'express';
import request from 'supertest';
import rateLimiter from '../rateLimiter';

jest.mock('../../config', () => ({
  __esModule: true,
  default: { rateLimit: { windowMs: 60000, max: 2 } },
}));

it('allows the configured requests then returns the unified 429 response and rate headers', async () => {
  const app = express();
  app.use(rateLimiter);
  app.get('/limited', (_req, res) => res.json({ ok: true }));

  expect((await request(app).get('/limited')).status).toBe(200);
  expect((await request(app).get('/limited')).status).toBe(200);
  const rejected = await request(app).get('/limited');

  expect(rejected.status).toBe(429);
  expect(rejected.body).toEqual(
    expect.objectContaining({
      status: 429,
      error: 'Too Many Requests',
      message: 'Too many requests, please try again later.',
      path: '/limited',
    })
  );
  expect(rejected.headers['retry-after']).toBeDefined();
  expect(rejected.headers['ratelimit-remaining']).toBe('0');
  expect(rejected.headers['x-ratelimit-limit']).toBeUndefined();
});
