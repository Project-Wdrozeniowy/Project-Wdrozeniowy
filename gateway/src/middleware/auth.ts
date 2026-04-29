import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import config from '../config';
import type { PublicRoute } from '../types';

function isPublicRoute(method: string, path: string): boolean {
  return config.publicRoutes.some(
    (route: PublicRoute) => route.method === method && route.path === path
  );
}

function extractBearerToken(authHeader: string | undefined): string | null {
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.slice(7);
}

function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (isPublicRoute(req.method, req.baseUrl + req.path)) {
    next();
    return;
  }

  const token = extractBearerToken(req.headers.authorization);
  if (!token) {
    res.status(401).json({ error: 'Missing or invalid Authorization header' });
    return;
  }

  const secret = Buffer.from(config.jwtSecret, 'base64');

  try {
    req.user = jwt.verify(token, secret, { algorithms: ['HS256'] });
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      res.status(401).json({ error: 'Token expired' });
      return;
    }
    res.status(401).json({ error: 'Invalid token' });
  }
}

export default authMiddleware;
