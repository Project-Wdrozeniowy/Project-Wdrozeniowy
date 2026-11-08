import morgan from 'morgan';
import type { Request, Response } from 'express';

morgan.token(
  'safe-path',
  (req) => (('originalUrl' in req ? String(req.originalUrl) : req.url) ?? '/').split('?')[0]
);
const FORMAT = ':method :safe-path :status :res[content-length] bytes - :response-time ms';

const accessLogger = morgan(FORMAT, {
  skip: (req: Request) => req.url === '/health',
});

const errorLogger = morgan(FORMAT, {
  skip: (_req: Request, res: Response) => res.statusCode < 400,
  stream: process.stderr,
});

const logger = {
  error: (...args: unknown[]): void => {
    console.error(...args);
  },
  warn: (...args: unknown[]): void => {
    console.warn(...args);
  },
  info: (...args: unknown[]): void => {
    console.info(...args);
  },
};

export { accessLogger, errorLogger, logger };
export default accessLogger;
