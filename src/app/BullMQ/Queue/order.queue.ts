import { Queue } from 'bullmq';
import { queueConnection } from '../../config/bullmq';

export const orderQueue = new Queue('order-queue', {
  connection: queueConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: true,
  },
});
