import type { JwtPayload } from 'jsonwebtoken';

export interface ErrorResponse {
  status: number;
  error: string;
  message: string;
  path: string;
  timestamp: string;
}

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
  /** HTTP method to match, or '*' to match any method */
  method: string;
  /** Exact path to match (used when pathPrefix is not set) */
  path?: string;
  /** Path prefix to match — any request starting with this prefix is treated as public */
  pathPrefix?: string;
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
