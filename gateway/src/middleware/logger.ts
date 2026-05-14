import morgan from 'morgan';
import type { Request, Response } from 'express';

const FORMAT = ':method :url :status :res[content-length] bytes - :response-time ms';

const accessLogger = morgan(FORMAT, {
  skip: (req: Request) => req.url === '/health',
});

const errorLogger = morgan(FORMAT, {
  skip: (_req: Request, res: Response) => res.statusCode < 400,
  stream: process.stderr,
});

export { accessLogger, errorLogger };
export default accessLogger;
