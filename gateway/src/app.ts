import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import corsMiddleware from './middleware/cors';
import rateLimiter from './middleware/rateLimiter';
import logger from './middleware/logger';
import authMiddleware from './middleware/auth';
import proxyMiddleware from './routes/proxy';

const app = express();

app.use(helmet());
app.use(corsMiddleware);
app.use(logger);
app.use(rateLimiter);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api', authMiddleware);
app.use(proxyMiddleware);

app.use((_err: Error, _req: Request, res: Response, _next: NextFunction): void => {
  res.status(500).json({ error: 'Internal server error' });
});

export default app;
