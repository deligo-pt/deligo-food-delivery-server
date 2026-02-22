/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextFunction, Request, Response } from 'express';
import httpStatus from 'http-status';
import AppError from '../errors/AppError';
import { redisClient } from '../utils/redis';
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
export const rateLimiter = (type: 'global' | 'auth' = 'global') => {
  const windowMs = type === 'auth' ? 60 * 1000 : 10 * 1000;
  const max = type === 'auth' ? 5 : 10;

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
      sendCommand: (...args: string[]) => redisClient.sendCommand(args),
    }),
    handler: (req: Request, res: Response, next: NextFunction) => {
      next(
        new AppError(
          httpStatus.TOO_MANY_REQUESTS,
          'Too many requests, please try again later.',
        ),
      );
    },
  });
};
