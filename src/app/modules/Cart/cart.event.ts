/* eslint-disable @typescript-eslint/no-explicit-any */
import { RedisService } from '../../config/redis';
import { Cart } from './cart.model';

export const initCartEventListener = () => {
  RedisService.onKeyExpire('cart:expiry:', async (expiredKey: string) => {
    try {
      console.log(`[Redis Expiry Triggered] Key: ${expiredKey}`);

      const customerId = expiredKey.split(':')[2];
      if (!customerId) {
        console.error('[Cart Event Error] Customer ID could not be extracted');
        return;
      }

      const dataKey = `cart:data:${customerId}`;
      const cartObj = await RedisService.get<any>(dataKey);

      if (cartObj) {
        const updatedCart = await Cart.findOneAndUpdate(
          { customerId: customerId },
          {
            items: cartObj.items,
            totalItems: cartObj.totalItems,
            cartCalculation: cartObj.cartCalculation,
            isDeleted: false,
            status: 'abandoned',
          },
          { upsert: true, new: true },
        );

        if (updatedCart) {
          console.log(
            `[Mongoose Success] Cart saved to DB for Customer: ${customerId}`,
          );
          await RedisService.del(dataKey);
          console.log(
            `[Cart Event Cleanup] Redis data key cleared for customer: ${customerId}`,
          );
        }
      } else {
        console.warn(
          `[Cart Event Warning] No data found in Redis for key: ${dataKey}`,
        );
      }
    } catch (error) {
      console.error('Error handling cart expiry event:', error);
    }
  });
};
