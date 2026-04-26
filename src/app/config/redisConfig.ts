/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * will replace redis.ts if it is correctly implemented.
 */
import Redis from 'ioredis';
import config from '../config';

const client = new Redis({
    host: config.redis.host,
    port: parseInt(config.redis.port as string, 10),
    password: config.redis.password || undefined,
    retryStrategy: (times) => Math.min(times * 50, 2000),
});

client.on('connect', () => console.log('Redis Client Connected (Food)'));
client.on('error', (err) => console.error('Redis Error:', err));

export const RedisService = {
    set: async (key: string, value: unknown, ttl: number = 3600) => {
        const data =
            typeof value === 'object' ? JSON.stringify(value) : String(value);
        await client.set(key, data, 'EX', ttl);
    },

    get: async <T>(key: string): Promise<T | null> => {
        const data = await client.get(key);
        if (!data) return null;
        try {
            return JSON.parse(data) as T;
        } catch {
            return data as unknown as T;
        }
    },
    del: async (key: string) => client.del(key),
    exists: async (key: string) => (await client.exists(key)) === 1,

    // Keep publish if you still need it
    publish: async (channel: string, message: unknown) => {
        const data = typeof message === 'object' && message !== null
            ? JSON.stringify(message)
            : String(message);
        await client.publish(channel, data);
    },

    // ====== Redis Streams Consumer Helpers ======
    addToStream: async (streamKey: string, eventData: Record<string, any>) => {
        // If any service also needs to publish
        const payload = { ...eventData, timestamp: new Date().toISOString() };
        return await client.xadd(streamKey, '*', 'data', JSON.stringify(payload));
    },

    /** Create consumer group (call once on startup) */
    createConsumerGroup: async (
        streamKey: string,
        groupName: string,
        startId: string = '$'   // '$' = only future messages, '0' = from beginning
    ) => {
        try {
            await client.xgroup('CREATE', streamKey, groupName, startId, 'MKSTREAM');
            console.log(`Consumer Group '${groupName}' created for stream '${streamKey}'`);
        } catch (err: any) {
            if (err.message.includes('BUSYGROUP')) {
                console.log(`Consumer Group '${groupName}' already exists`);
            } else {
                throw err;
            }
        }
    },
    /** Expose raw client for stream operations (xreadgroup, xack, etc.) */
    getClient: () => client,
};

export default client;