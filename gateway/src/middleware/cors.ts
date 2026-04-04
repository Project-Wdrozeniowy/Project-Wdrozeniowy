import cors from 'cors';
import config from '../config';

const corsMiddleware = cors({
  origin: (origin, callback) => {
    if (!origin || config.cors.origins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: origin '${origin}' not allowed`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});

export default corsMiddleware;
