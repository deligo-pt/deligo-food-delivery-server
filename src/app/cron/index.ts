import cron from 'node-cron';
import { handleOrderExpiryCron } from './order.cron';
import { handlePayoutAutomatedCron } from './payout.cron';
import { releaseAbandonedIngredientStockCron } from './ingredientOrder.crone';

export const initAllCronJobs = () => {
  // Order Expiry cron
  cron.schedule('* * * * *', async () => {
    await handleOrderExpiryCron();
  });

  cron.schedule('*/5 * * * *', async () => {
    await releaseAbandonedIngredientStockCron();
  });

  // Payout Automated Settlement Cron
  cron.schedule('0 0 * * *', async () => {
    await handlePayoutAutomatedCron();
  });
};
