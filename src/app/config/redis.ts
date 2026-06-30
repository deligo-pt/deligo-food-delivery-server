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

const expirySubscriptions = new Map<
  string,
  (key: string) => void | Promise<void>
>();

subscriber.on('message', (channel, message) => {
  const callback = subscriptions.get(channel);
  if (callback) {
    try {
      callback(JSON.parse(message));
    } catch {
      callback(message);
    }
  }
});

subscriber.on('pmessage', async (pattern, channel, expiredKey) => {
  if (expiredKey) {
    for (const [prefix, callback] of expirySubscriptions.entries()) {
      if (expiredKey.startsWith(prefix)) {
        await callback(expiredKey);
      }
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

  async keys(pattern: string): Promise<string[]> {
    return await redis.keys(pattern);
  },

  publish: async (channel: string, message: unknown) => {
    const data =
      typeof message === 'object' ? JSON.stringify(message) : String(message);
    await redis.publish(channel, data);
  },

  subscribe: async (channel: string, callback: (data: any) => void) => {
    subscriptions.set(channel, callback);
    await subscriber.subscribe(channel);
    console.log(`Listening to channel: ${channel}`);
  },

  onKeyExpire: (
    keyPrefix: string,
    callback: (key: string) => void | Promise<void>,
  ) => {
    expirySubscriptions.set(keyPrefix, callback);
    console.log(`Dynamic expiry handler registered for prefix: ${keyPrefix}`);
  },

  initKeySpaceNotification: async () => {
    await redis.config('SET', 'notify-keyspace-events', 'Ex');

    await subscriber.psubscribe('__keyevent@0__:expired');
    console.log(
      'Redis Keyspace Expiry Notifications Activated with Config SET',
    );
  },
};

export default redis;
