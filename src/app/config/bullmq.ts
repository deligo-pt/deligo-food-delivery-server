import { ConnectionOptions } from 'bullmq';
import config from '../config';

export const queueConnection: ConnectionOptions = {
  host: config.redis.host,
  port: parseInt(config.redis.port as string, 10),
  password: config.redis.password || undefined,
  maxRetriesPerRequest: null,
};
