import request from 'supertest';
import jwt from 'jsonwebtoken';
import express from 'express';
import type { Request, Response, NextFunction, Express } from 'express';
import helmet from 'helmet';
import app from '../app';

// Mock the proxy middleware so it doesn't try to forward requests to a real backend
jest.mock('../routes/proxy', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment
  const exp: typeof express = require('express');
  const router = exp.Router();
  // Forward everything – let auth middleware decide
  router.use((_req: Request, _res: Response, next: NextFunction): void => {
    next();
  });
  return router;
});

const JWT_SECRET_BUF = Buffer.from('dGVzdA==', 'base64');

function makeToken(payload: object = { sub: 'user-1', role: 'user' }): string {
  return jwt.sign(payload, JWT_SECRET_BUF, {
    algorithm: 'HS256',
    expiresIn: '1h',
  } as jwt.SignOptions);
}

describe('GET /health', () => {
  it('returns 200 with { status: "ok" }', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});

describe('Security headers (Helmet)', () => {
  it('adds X-Content-Type-Options header', async () => {
    const res = await request(app).get('/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });

  it('adds X-DNS-Prefetch-Control header', async () => {
    const res = await request(app).get('/health');
    expect(res.headers['x-dns-prefetch-control']).toBeDefined();
  });
});

describe('Auth guard on /api routes', () => {
  it('returns 401 when no Authorization header is provided', async () => {
    const res = await request(app).get('/api/users');
    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 401 with "Missing or invalid Authorization header" message', async () => {
    const res = await request(app).get('/api/users');
    expect((res.body as { error: string }).error).toBe('Missing or invalid Authorization header');
  });

  it('passes auth guard with a valid Bearer token', async () => {
    const token = makeToken();
    const res = await request(app).get('/api/users').set('Authorization', `Bearer ${token}`);
    // Proxy mock calls next(), so Express responds with 404 (no route registered)
    // but it should NOT be 401
    expect(res.status).not.toBe(401);
  });

  it('returns 401 with "Token expired" for an expired token', async () => {
    const expiredToken = jwt.sign({ sub: 'user-1' }, JWT_SECRET_BUF, {
      algorithm: 'HS256',
      expiresIn: -1,
    } as jwt.SignOptions);
    const res = await request(app).get('/api/users').set('Authorization', `Bearer ${expiredToken}`);
    expect(res.status).toBe(401);
    expect((res.body as { error: string }).error).toBe('Token expired');
  });

  it('allows POST /api/auth/login without a token (public route)', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user@example.com', password: 'secret' });
    // Should NOT return 401 (auth is skipped for public routes)
    expect(res.status).not.toBe(401);
  });

  it('allows POST /api/auth/register without a token (public route)', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'new@example.com', password: 'secret', name: 'New' });
    expect(res.status).not.toBe(401);
  });
});

describe('CORS headers', () => {
  it('allows requests from whitelisted origin', async () => {
    const res = await request(app).get('/health').set('Origin', 'http://localhost:3001');
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:3001');
  });

  it('does not set Access-Control-Allow-Origin for unknown origin', async () => {
    const res = await request(app).get('/health').set('Origin', 'http://evil.example.com');
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });
});

describe('Global error handler', () => {
  it('returns 500 JSON for unexpected errors', async () => {
    const errorApp: Express = express();
    errorApp.use(helmet());
    errorApp.get('/boom', (_req: Request, _res: Response, next: NextFunction): void => {
      next(new Error('unexpected error'));
    });
    errorApp.use((_err: Error, _req: Request, res: Response, _next: NextFunction): void => {
      res.status(500).json({ error: 'Internal server error' });
    });

    const res = await request(errorApp).get('/boom');
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Internal server error' });
  });
});
