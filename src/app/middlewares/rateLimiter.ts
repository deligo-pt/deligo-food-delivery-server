/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextFunction, Request, Response } from 'express';
import httpStatus from 'http-status';
import AppError from '../errors/AppError';
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import client from '../config/redis';
export const rateLimiter = (type: 'global' | 'auth' = 'global') => {
  const windowMs = 1 * 60 * 1000;
  const max = type === 'auth' ? 10 : 100;

  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    validate: {
      default: false,
    },
    keyGenerator: (req: Request) => {
      const ip = req.ip || req.headers['x-forwarded-for'] || 'anonymous';
      return `${type}:${ip}`;
    },
    store: new RedisStore({
      sendCommand: async (...args: string[]) => {
        return (await client.call(args[0], ...args.slice(1))) as any;
      },
      prefix: `rl:${type}:`,
    }),
    handler: (req: Request, res: Response, next: NextFunction) => {
      const resetTime = (req as any).rateLimit.resetTime;
      const secondsLeft = Math.ceil((resetTime.getTime() - Date.now()) / 1000);
      next(
        new AppError(
          httpStatus.TOO_MANY_REQUESTS,
          `Too many requests. Please try again after ${secondsLeft} seconds.`,
        ),
      );
    },
  });
};
