import type { Request, Response, NextFunction } from 'express';
import type { ErrorResponse } from '../types';

const HTTP_REASON_PHRASES: Record<number, string> = {
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  429: 'Too Many Requests',
  500: 'Internal Server Error',
  502: 'Bad Gateway',
  503: 'Service Unavailable',
};

function getReasonPhrase(status: number): string {
  return HTTP_REASON_PHRASES[status] ?? 'Unknown Error';
}

export function sendError(res: Response, req: Request, status: number, message: string): void {
  const body: ErrorResponse = {
    status,
    error: getReasonPhrase(status),
    message,
    path: req.originalUrl,
    timestamp: new Date().toISOString(),
  };
  res.status(status).json(body);
}

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
  console.error(`[error] ${req.method} ${req.originalUrl} — ${err.message}`);
  sendError(res, req, 500, 'Internal server error');
}
