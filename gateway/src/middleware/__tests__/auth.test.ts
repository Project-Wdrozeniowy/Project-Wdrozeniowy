import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';
import authMiddleware from '../auth';

// JWT secret must match what's set in test/setup.ts (base64 of "test")
const JWT_SECRET_B64 = 'dGVzdA==';
const JWT_SECRET_BUF = Buffer.from(JWT_SECRET_B64, 'base64');

function signToken(payload: object, expiresIn: string | number = '1h'): string {
  return jwt.sign(payload, JWT_SECRET_BUF, { algorithm: 'HS256', expiresIn } as jwt.SignOptions);
}

function mockReq(overrides: {
  method?: string;
  baseUrl?: string;
  path?: string;
  authorization?: string;
}): Partial<Request> {
  return {
    method: overrides.method ?? 'GET',
    baseUrl: overrides.baseUrl ?? '/api',
    path: overrides.path ?? '/users',
    originalUrl: (overrides.baseUrl ?? '/api') + (overrides.path ?? '/users'),
    headers: {
      authorization: overrides.authorization,
    },
  } as Partial<Request>;
}

function mockRes(): { status: jest.Mock; json: jest.Mock } {
  const res: { status: jest.Mock; json: jest.Mock } = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return res;
}

describe('authMiddleware – public routes bypass auth', () => {
  it('calls next() for POST /api/auth/login without any token', () => {
    const req = mockReq({ method: 'POST', baseUrl: '/api', path: '/auth/login' });
    const res = mockRes();
    const next: NextFunction = jest.fn();

    authMiddleware(req as Request, res as unknown as Response, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('calls next() for POST /api/auth/register without any token', () => {
    const req = mockReq({ method: 'POST', baseUrl: '/api', path: '/auth/register' });
    const res = mockRes();
    const next: NextFunction = jest.fn();

    authMiddleware(req as Request, res as unknown as Response, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
});

describe('authMiddleware – missing / invalid Authorization header', () => {
  it('returns 401 when Authorization header is missing', () => {
    const req = mockReq({ method: 'GET', baseUrl: '/api', path: '/users' });
    const res = mockRes();
    const next: NextFunction = jest.fn();

    authMiddleware(req as Request, res as unknown as Response, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 401,
        error: 'Unauthorized',
        message: 'Missing or invalid Authorization header',
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when Authorization uses Basic scheme instead of Bearer', () => {
    const req = mockReq({ authorization: 'Basic dXNlcjpwYXNz' });
    const res = mockRes();
    const next: NextFunction = jest.fn();

    authMiddleware(req as Request, res as unknown as Response, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 401,
        error: 'Unauthorized',
        message: 'Missing or invalid Authorization header',
      })
    );
  });
});

describe('authMiddleware – valid JWT', () => {
  it('calls next() and sets req.user when token is valid', () => {
    const token = signToken({ sub: 'user-1', role: 'user' });
    const req = mockReq({ authorization: `Bearer ${token}` }) as Request;
    const res = mockRes();
    const next: NextFunction = jest.fn();

    authMiddleware(req, res as unknown as Response, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
    expect(req.user).toBeDefined();
  });
});

describe('authMiddleware – expired JWT', () => {
  it('returns 401 with "Token expired" message', () => {
    // Sign with expiresIn of -1 second (already expired)
    const token = jwt.sign({ sub: 'user-1' }, JWT_SECRET_BUF, {
      algorithm: 'HS256',
      expiresIn: -1,
    } as jwt.SignOptions);
    const req = mockReq({ authorization: `Bearer ${token}` });
    const res = mockRes();
    const next: NextFunction = jest.fn();

    authMiddleware(req as Request, res as unknown as Response, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ status: 401, error: 'Unauthorized', message: 'Token expired' })
    );
    expect(next).not.toHaveBeenCalled();
  });
});

describe('authMiddleware – invalid JWT', () => {
  it('returns 401 with "Invalid token" for a tampered token', () => {
    const token = signToken({ sub: 'user-1' });
    const tampered = token.slice(0, -5) + 'XXXXX';
    const req = mockReq({ authorization: `Bearer ${tampered}` });
    const res = mockRes();
    const next: NextFunction = jest.fn();

    authMiddleware(req as Request, res as unknown as Response, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ status: 401, error: 'Unauthorized', message: 'Invalid token' })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 with "Invalid token" for a completely fake token', () => {
    const req = mockReq({ authorization: 'Bearer not.a.real.token' });
    const res = mockRes();
    const next: NextFunction = jest.fn();

    authMiddleware(req as Request, res as unknown as Response, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ status: 401, error: 'Unauthorized', message: 'Invalid token' })
    );
  });
});
