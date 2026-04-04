import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import config from '../config';
import type { PublicRoute } from '../types';

function isPublicRoute(method: string, path: string): boolean {
  return config.publicRoutes.some(
    (route: PublicRoute) => route.method === method && route.path === path,
  );
}

function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (isPublicRoute(req.method, req.path)) {
    next();
    return;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid Authorization header' });
    return;
  }

  const token = authHeader.slice(7);

  try {
    req.user = jwt.verify(token, config.jwtSecret);
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
