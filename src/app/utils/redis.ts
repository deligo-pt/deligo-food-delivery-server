/* eslint-disable @typescript-eslint/no-explicit-any */
import config from '../config';
import { createClient } from 'redis';

export const redisClient = createClient({
  url: config.redis.local_url || 'redis://localhost:6379',
});

redisClient.on('error', (err) => console.error('Redis Client Error', err));

(async () => {
  if (!redisClient.isOpen) {
    await redisClient.connect();
    console.log('Successfully connected to Redis');
  }
})();

export const RedisService = {
  set: async (key: string, value: any, ttlSeconds: number = 3600) => {
    const data = typeof value === 'object' ? JSON.stringify(value) : value;
    await redisClient.set(key, data, { EX: ttlSeconds });
  },

  get: async <T>(key: string): Promise<T | null> => {
    const data = await redisClient.get(key);
    if (!data) return null;
    try {
      return JSON.parse(data) as T;
    } catch (e) {
      return data as unknown as T;
    }
  },

  del: async (key: string) => {
    await redisClient.del(key);
  },
};
