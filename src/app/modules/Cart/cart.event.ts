import { RedisService } from '../../config/redis';
import { Cart } from './cart.model';

export const initCartEventListener = () => {
  RedisService.onKeyExpire('cart:expiry:', async (expiredKey: string) => {
    try {
      const customerId = expiredKey.split(':')[2];
      const dataKey = `cart:data:${customerId}`;

      const cartObj = await RedisService.get<any>(dataKey);

      if (cartObj) {
        await Cart.findOneAndUpdate(
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

        await RedisService.del(dataKey);

        console.log(
          `[Cart Event] Customer ${customerId} cart has been updated to redis and mongodb`,
        );
      }
    } catch (error) {
      console.error('Error handling cart expiry event:', error);
    }
  });
};
