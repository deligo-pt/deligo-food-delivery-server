import cron from 'node-cron';
import { handleOrderExpiryCron } from './order.cron';
import { handlePayoutAutomatedCron } from './payout.cron';

export const initAllCronJobs = () => {
  // Order Expiry
  cron.schedule('* * * * *', async () => {
    await handleOrderExpiryCron();
  });

  // Payout Automated Settlement Cron
  cron.schedule('* * * * *', async () => {
    await handlePayoutAutomatedCron();
  });
};
