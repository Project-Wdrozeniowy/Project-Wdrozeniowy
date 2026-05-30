import type { Request, Response, NextFunction } from 'express';
import type { IncomingMessage, ServerResponse } from 'http';
import { STATUS_CODES } from 'http';
import type { ErrorResponse } from '../types';
import { logger } from './logger';

function getReasonPhrase(status: number): string {
  return STATUS_CODES[status] ?? 'Unknown Error';
}

export function sendError(
  res: Response | ServerResponse,
  req: Request | IncomingMessage,
  status: number,
  message: string
): void {
  const path = 'originalUrl' in req ? req.originalUrl : (req.url ?? '/');
  const body: ErrorResponse = {
    status,
    error: getReasonPhrase(status),
    message,
    path,
    timestamp: new Date().toISOString(),
  };

  if ('status' in res && typeof res.status === 'function' && typeof res.json === 'function') {
    res.status(status).json(body);
    return;
  }

  const rawRes = res as ServerResponse;
  rawRes.writeHead(status, { 'Content-Type': 'application/json' });
  rawRes.end(JSON.stringify(body));
}

export function errorHandler(
  err: Error & { status?: number; statusCode?: number },
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const status = err.status ?? err.statusCode ?? 500;
  const message = status >= 500 ? 'Internal server error' : err.message;
  logger.error(`[error] ${req.method} ${req.originalUrl} — ${err.message}`);
  sendError(res, req, status, message);
}
