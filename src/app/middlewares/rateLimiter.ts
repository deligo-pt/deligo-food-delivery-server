import { Ratelimit } from '@upstash/ratelimit';
import { redis } from '../utils/redis';
import { Request, Response, NextFunction } from 'express';
import httpStatus from 'http-status';
import AppError from '../errors/AppError';

// Global Rate Limiter: 10 requests every 10 seconds
const globalRatelimit = new Ratelimit({
  redis: redis,
  limiter: Ratelimit.slidingWindow(10, '10 s'),
  analytics: true,
});

// Auth Rate Limiter: 5 requests every 60 seconds
const authRatelimit = new Ratelimit({
  redis: redis,
  limiter: Ratelimit.slidingWindow(5, '60 s'),
  analytics: true,
});

// Middleware for rate limiting
export const rateLimiter = (type: 'global' | 'auth' = 'global') => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const identifier = req.ip || 'anonymous';

    const limiter = type === 'auth' ? authRatelimit : globalRatelimit;

    const { success, limit, reset, remaining } =
      await limiter.limit(identifier);
    const waitTimeInSeconds = Math.ceil((reset - Date.now()) / 1000);
    res.set({
      'X-RateLimit-Limit': limit.toString(),
      'X-RateLimit-Remaining': remaining.toString(),
      'X-RateLimit-Reset': reset.toString(),
    });

    if (!success) {
      const waitMessage =
        waitTimeInSeconds >= 60
          ? `${Math.ceil(waitTimeInSeconds / 60)} minute(s)`
          : `${waitTimeInSeconds} second(s)`;
      return next(
        new AppError(
          httpStatus.TOO_MANY_REQUESTS,
          `Too many requests. Please try again after ${waitMessage}`,
        ),
      );
    }

    next();
  };
};
