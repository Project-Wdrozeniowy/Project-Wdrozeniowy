import rateLimit from 'express-rate-limit';
import type { Request, Response } from 'express';
import config from '../config';
import { sendError } from './errorHandler';

const rateLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    sendError(res, req, 429, 'Too many requests, please try again later.');
  },
});

export default rateLimiter;
