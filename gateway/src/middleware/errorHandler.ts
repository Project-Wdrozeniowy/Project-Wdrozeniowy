import type { Request, Response, NextFunction } from 'express';
import type { IncomingMessage, ServerResponse } from 'http';
import { STATUS_CODES } from 'http';
import type { ErrorResponse } from '../types';
import { logger } from './logger';

export function safePath(req: Request | IncomingMessage): string {
  return ('originalUrl' in req ? req.originalUrl : (req.url ?? '/')).split('?')[0];
}

export function sendError(
  res: Response | ServerResponse,
  req: Request | IncomingMessage,
  status: number,
  detail: string
): void {
  if (res.headersSent) {
    res.destroy();
    return;
  }
  const body: ErrorResponse = {
    type: 'about:blank',
    title: STATUS_CODES[status] ?? 'Unknown Error',
    status,
    detail,
    instance: safePath(req),
  };
  res.writeHead(status, {
    'Content-Type': 'application/problem+json',
    'Cache-Control': 'no-store',
  });
  res.end(JSON.stringify(body));
}

export function errorHandler(
  err: Error & { status?: number; statusCode?: number },
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const candidate = err.status ?? err.statusCode ?? 500;
  const status =
    Number.isInteger(candidate) && candidate >= 400 && candidate <= 599 ? candidate : 500;
  const detail =
    status === 413
      ? 'Request body too large'
      : status === 415
        ? 'Unsupported content encoding'
        : status >= 500
          ? 'Internal server error'
          : 'Invalid request';
  logger.error(`[http] ${req.method} ${safePath(req)} ${String(status)}`);
  sendError(res, req, status, detail);
}
