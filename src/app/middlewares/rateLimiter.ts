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
  const ip =
    req.headers['x-forwarded-for'] ||
    req.headers['x-real-ip'] ||
    req.headers['x-vercel-forwarded-for'] ||
    req.connection.remoteAddress ||
    req.ip ||
    'anonymous';

  const finalIp = Array.isArray(ip)
    ? ip[0]
    : typeof ip === 'string'
      ? ip.split(',')[0]
      : ip;

  return String(finalIp).replace('::ffff:', '').trim();
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
  handler: (req: Request, res: Response, next: NextFunction) => {
    const resetTime = (req as any).rateLimit.resetTime;
    const secondsLeft = Math.ceil((resetTime.getTime() - Date.now()) / 1000);
    next(
      new AppError(
        httpStatus.TOO_MANY_REQUESTS,
        `Too many auth attempts. Please try again after ${secondsLeft} seconds.`,
      ),
    );
  },
});

export const rateLimiter = (type: 'global' | 'auth' = 'global') => {
  return type === 'auth' ? authLimit : globalLimit;
};
