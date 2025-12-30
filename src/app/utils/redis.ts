/* eslint-disable @typescript-eslint/no-explicit-any */
import { Redis } from '@upstash/redis';
import config from '../config';

export const redis = new Redis({
  url: config.upstash_redis_rest_url as string,
  token: config.upstash_redis_rest_token as string,
});

export const RedisService = {
  set: async (key: string, value: any, ttlSeconds: number = 3600) => {
    const data = typeof value === 'object' ? JSON.stringify(value) : value;
    await redis.set(key, data, { ex: ttlSeconds });
  },

  get: async <T>(key: string): Promise<T | null> => {
    const data = await redis.get(key);
    if (!data) return null;
    return typeof data === 'string' ? (JSON.parse(data) as T) : (data as T);
  },

  del: async (key: string) => {
    await redis.del(key);
  },
};
