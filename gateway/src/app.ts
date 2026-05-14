import express from 'express';
import helmet from 'helmet';
import corsMiddleware from './middleware/cors';
import rateLimiter from './middleware/rateLimiter';
import { accessLogger, errorLogger } from './middleware/logger';
import authMiddleware from './middleware/auth';
import proxyMiddleware from './routes/proxy';
import { errorHandler } from './middleware/errorHandler';

const app = express();

app.use(helmet());
app.use(corsMiddleware);
app.use(accessLogger);
app.use(errorLogger);
app.use(rateLimiter);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api', authMiddleware);
app.use(proxyMiddleware);

app.use(errorHandler);

export default app;
