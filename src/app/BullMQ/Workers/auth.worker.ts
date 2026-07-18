import { Job, Worker } from 'bullmq';
import { LoginHistory } from '../../modules/LoginHistory/loginHistory.model';
import { queueConnection } from '../../config/bullmq';

export const authWorker = new Worker(
  'auth-queue',
  async (job: Job) => {
    switch (job.name) {
      case 'CREATE_LOGIN_LOG':
        try {
          await LoginHistory.create(job.data);
        } catch (error) {
          console.error(`[Auth Worker] Failed to save login history:`, error);
          throw error;
        }
        break;

      default:
        console.warn(`[Auth Worker] Job name ${job.name} not handled.`);
    }
  },
  {
    connection: queueConnection,
    concurrency: 2,
  },
);
