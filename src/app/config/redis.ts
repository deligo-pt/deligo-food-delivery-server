/* eslint-disable no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import Redis from 'ioredis';
import config from '../config';

const redis = new Redis({
  host: config.redis.host,
  port: parseInt(config.redis.port as string, 10),
  password: config.redis.password || undefined,
});

const subscriber = new Redis({
  host: config.redis.host,
  port: parseInt(config.redis.port as string, 10),
  password: config.redis.password || undefined,
});

// Connection
redis.on('connect', () => console.log('Redis Main Connected'));
subscriber.on('connect', () => console.log('Redis Subscriber Connected'));

// Error handling
redis.on('error', (err) => console.error('Redis Main Error:', err));
subscriber.on('error', (err) => console.error('Redis Subscriber Error:', err));

const subscriptions = new Map<string, (data: any) => void>();

subscriber.on('message', (channel, message) => {
  console.log(`Raw message received on channel: ${channel}`);
  const callback = subscriptions.get(channel);
  if (callback) {
    try {
      callback(JSON.parse(message));
    } catch {
      callback(message);
    }
  }
});

export const RedisService = {
  set: async (key: string, value: unknown, ttl: number = 3600) => {
    const data =
      typeof value === 'object' ? JSON.stringify(value) : String(value);
    await redis.set(key, data, 'EX', ttl);
  },

  get: async <T>(key: string): Promise<T | null> => {
    const data = await redis.get(key);
    if (!data) return null;
    try {
      return JSON.parse(data) as T;
    } catch {
      return data as unknown as T;
    }
  },

  del: async (key: string) => await redis.del(key),

  exists: async (key: string): Promise<boolean> => {
    const result = await redis.exists(key);
    return result === 1;
  },

  publish: async (channel: string, message: unknown) => {
    const data =
      typeof message === 'object' ? JSON.stringify(message) : String(message);
    const result = await redis.publish(channel, data);
    console.log(`Published to ${channel}. Recipients: ${result}`);
  },

  subscribe: async (channel: string, callback: (data: any) => void) => {
    subscriptions.set(channel, callback);
    await subscriber.subscribe(channel);
    console.log(`Listening to channel: ${channel}`);
  },
};

export default redis;
