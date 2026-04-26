/* eslint-disable no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import Redis from 'ioredis';
import config from '../config';

/**
 * Main Redis client for general operations (GET, SET, Streams, Publish)
 */
const client = new Redis({
  host: config.redis.host,
  port: parseInt((config.redis.port as string) || '6379', 10),
  password: config.redis.password || undefined,
  retryStrategy: (times) => Math.min(times * 50, 2000), // Exponential backoff for reConnections
});

/**
 * Dedicated Redis client for Subscribing only.
 * Necessary because a client in 'subscriber' mode cannot execute other commands.
 */
const subscriber = new Redis({
  host: config.redis.host,
  port: parseInt((config.redis.port as string) || '6379', 10),
  password: config.redis.password || undefined,
  retryStrategy: (times) => Math.min(times * 50, 2000),
});

// --- Connection Events ---
client.on('connect', () => console.log('Redis Main Client Connected'));
subscriber.on('connect', () => console.log('Redis Subscriber Connected'));

// --- Error Handlers ---
client.on('error', (err) => console.error('Redis Main Client Error:', err));
subscriber.on('error', (err) => console.error('Redis Subscriber Error:', err));

// Stores local callbacks for Pub/Sub channels
const subscriptions = new Map<string, (data: any) => void>();

/**
 * Global listener for the subscriber client.
 * Routes incoming messages to the correct callback stored in the Map.
 */
subscriber.on('message', (channel, message) => {
  const callback = subscriptions.get(channel);
  if (callback) {
    try {
      callback(JSON.parse(message)); // Attempt to parse if data is JSON
    } catch {
      callback(message); // Fallback to raw message if parsing fails
    }
  }
});

export const RedisService = {
  /**
   * Set a value in Redis with an optional TTL (Time To Live)
   * @param key Redis key
   * @param value Data to store (objects will be stringified)
   * @param ttl Expiry time in seconds (default: 1 hour)
   */
  set: async (key: string, value: unknown, ttl: number = 3600) => {
    const data =
      typeof value === 'object' && value !== null
        ? JSON.stringify(value)
        : String(value);
    await client.set(key, data, 'EX', ttl);
  },

  /**
   * Retrieve and parse data from Redis
   * @param key Redis key
   */
  get: async <T>(key: string): Promise<T | null> => {
    const data = await client.get(key);
    if (!data) return null;
    try {
      return JSON.parse(data) as T;
    } catch {
      return data as unknown as T;
    }
  },

  /** Delete a key from Redis */
  del: async (key: string) => await client.del(key),

  /** Check if a key exists */
  exists: async (key: string) => (await client.exists(key)) === 1,

  // --- Pub/Sub Operations ---

  /**
   * Publish a message to a specific channel
   */
  publish: async (channel: string, message: unknown) => {
    const data =
      typeof message === 'object' && message !== null
        ? JSON.stringify(message)
        : String(message);
    return await client.publish(channel, data);
  },

  /**
   * Subscribe to a channel and execute a callback on new messages
   */
  subscribe: async (channel: string, callback: (data: any) => void) => {
    subscriptions.set(channel, callback);
    await subscriber.subscribe(channel);
    console.log(`Subscribed to channel: ${channel}`);
  },

  // --- Redis Streams Operations ---

  /**
   * Append an event/message to a Redis Stream
   * @param streamKey The name of the stream
   * @param eventData Record of data to be stored
   */
  addToStream: async (streamKey: string, eventData: Record<string, any>) => {
    const payload = { ...eventData, timestamp: new Date().toISOString() };
    return await client.xadd(streamKey, '*', 'data', JSON.stringify(payload));
  },

  /**
   * Create a Consumer Group for a Stream
   * @param startId '$' for new messages only, '0' for all messages in stream
   */
  createConsumerGroup: async (
    streamKey: string,
    groupName: string,
    startId: string = '$', // '$' = only future messages, '0' = from beginning
  ) => {
    try {
      // MKSTREAM automatically creates the stream if it doesn't exist
      await client.xgroup('CREATE', streamKey, groupName, startId, 'MKSTREAM');
      console.log(
        `Consumer Group '${groupName}' created for stream '${streamKey}'`,
      );
    } catch (err: any) {
      // Ignore error if the group already exists
      if (err.message.includes('BUSYGROUP')) {
        console.log(`Consumer Group '${groupName}' already exists`);
      } else {
        throw err;
      }
    }
  },

  // --- Utility Functions ---

  /** Get the raw ioredis client instance */
  getClient: () => client,

  /** Get the raw ioredis subscriber instance */
  getSubscriber: () => subscriber,
};

export default client;
