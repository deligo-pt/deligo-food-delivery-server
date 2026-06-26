import cron from 'node-cron';
import { handleOrderExpiryCron } from './order.cron';
import { handlePayoutAutomatedCron } from './payout.cron';
import { releaseAbandonedIngredientStockCron } from './ingredientOrder.crone';
import { Cart } from '../modules/Cart/cart.model';

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

  // 2 days old abandoned cart cleanup
  cron.schedule('0 0 * * *', async () => {
    try {
      console.log('[Cron] Starting 2 days old abandoned cart cleanup...');

      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

      const result = await Cart.deleteMany({
        isDeleted: false,
        status: 'abandoned',
        updatedAt: { $lte: twoDaysAgo },
      });

      console.log(
        `[Cron Success] ${result.deletedCount} abandoned carts cleaned up successfully`,
      );
    } catch (error) {
      console.error('[Cron Error] Cart cleanup failed:', error);
    }
  });
};
