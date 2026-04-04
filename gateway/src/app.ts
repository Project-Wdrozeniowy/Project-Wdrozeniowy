import express from 'express';
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
app.use('/api', proxyMiddleware);

export default app;
