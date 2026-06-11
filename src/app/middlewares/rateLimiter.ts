/* eslint-disable no-unused-vars */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import AppError from '../errors/AppError';
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import redis from '../config/redis';
import { NextFunction, Request, Response } from 'express';
import httpStatus from 'http-status';

const getIP = (req: Request): string => {
  const forwarded = req.headers['x-forwarded-for'];
  const ip = Array.isArray(forwarded)
    ? forwarded[0]
    : forwarded || req.ip || 'anonymous';
  return String(ip);
};

const createLimiterHandler = (messagePrefix: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const rateLimitInfo = (req as any).rateLimit;
    const resetTime = rateLimitInfo?.resetTime;

    const secondsLeft = resetTime
      ? Math.ceil((resetTime.getTime() - Date.now()) / 1000)
      : 60;

    next(
      new AppError(
        httpStatus.TOO_MANY_REQUESTS,
        `${messagePrefix} Please try again after ${secondsLeft} seconds.`,
      ),
    );
  };
};

const globalLimit = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  validate: {
    xForwardedForHeader: false,
    default: false,
  },
  keyGenerator: (req) => getIP(req),
  store: new RedisStore({
    sendCommand: async (...args: string[]) =>
      (await redis.call(args[0], ...args.slice(1))) as any,
    prefix: 'rl:global:',
  }),
  handler: createLimiterHandler('Too many requests from this IP.'),
});

const authLimit = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  validate: {
    xForwardedForHeader: false,
    default: false,
  },
  keyGenerator: (req) => getIP(req),
  store: new RedisStore({
    sendCommand: async (...args: string[]) =>
      (await redis.call(args[0], ...args.slice(1))) as any,
    prefix: 'rl:auth:',
  }),
  handler: createLimiterHandler('Too many auth attempts.'),
});

export const rateLimiter = (type: 'global' | 'auth' = 'global') => {
  return type === 'auth' ? authLimit : globalLimit;
};
