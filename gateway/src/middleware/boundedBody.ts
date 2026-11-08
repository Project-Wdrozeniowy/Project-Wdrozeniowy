import express from 'express';
import type { RequestHandler } from 'express';
import config from '../config';
import { sendError } from './errorHandler';

/** Bound the original bytes before any upstream mutation can receive a partial oversized body. */
const raw = express.raw({ type: () => true, limit: config.http.maxBodyBytes, inflate: false });
export const boundedBody: RequestHandler = (req, res, next) => {
  const timer = setTimeout(() => {
    sendError(res, req, 408, 'Request body timed out');
    req.resume();
  }, config.http.bodyTimeoutMs);
  raw(req, res, (error?: unknown) => {
    clearTimeout(timer);
    if (!res.writableEnded && !res.destroyed) {
      next(error);
    }
  });
  res.once('close', () => {
    clearTimeout(timer);
  });
};
