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

export const loginLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  limit: config.rateLimit.loginMax,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    sendError(res, req, 429, 'Too many login attempts');
  },
});

export const csrfLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  limit: config.rateLimit.csrfMax,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    sendError(res, req, 429, 'Too many session bootstrap requests');
  },
});
