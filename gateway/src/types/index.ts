import type { JwtPayload } from 'jsonwebtoken';

export interface GatewayConfig {
  port: number;
  backendUrl: string;
  jwtSecret: string;
  cors: {
    origins: string[];
  };
  rateLimit: {
    windowMs: number;
    max: number;
  };
  publicRoutes: PublicRoute[];
}

export interface PublicRoute {
  method: string;
  path: string;
}

export type AuthenticatedUser = string | JwtPayload;

// Augment Express Request with authenticated user
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}
