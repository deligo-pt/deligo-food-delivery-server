import { Worker, Job } from 'bullmq';
import { queueConnection } from '../../config/bullmq';
import {
  processNewOrderPostProcess,
  processOrderPostUpdate,
} from '../../modules/Order/order.worker';

export const orderWorker = new Worker(
  'order-queue',
  async (job: Job) => {
    switch (job.name) {
      case 'PROCESS_ORDER_POST_UPDATE':
        await processOrderPostUpdate(job);
        break;

      case 'NEW_ORDER_POST_PROCESS':
        await processNewOrderPostProcess(job);
        break;

      default:
        console.warn(`[Worker] Job name ${job.name} not handled.`);
    }
  },
  { connection: queueConnection, concurrency: 5 },
);
