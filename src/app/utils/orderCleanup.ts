/* eslint-disable @typescript-eslint/no-explicit-any */
import cron from 'node-cron';
import { Order } from '../modules/Order/order.model';
import { getIO } from '../lib/Socket';
import { Vendor } from '../modules/Vendor/vendor.model';
export const initOrderCronJobs = () => {
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();

      const expiredOrders = await Order.find({
        orderStatus: 'DISPATCHING',
        dispatchExpiresAt: { $lt: now },
        isDeleted: false,
      }).populate('vendorId');

      if (expiredOrders.length > 0) {
        for (const order of expiredOrders) {
          await Order.updateOne(
            { _id: order._id },
            {
              $set: {
                orderStatus: 'AWAITING_PARTNER',
                dispatchPartnerPool: [],
              },
            },
          );

          const io = getIO();

          let vendorUserId = '';

          if (
            typeof order.vendorId === 'object' &&
            (order.vendorId as any).userId
          ) {
            vendorUserId = (order.vendorId as any).userId;
          } else if (order.vendorId) {
            const vendor = await Vendor.findById(order.vendorId).select(
              'userId',
            );
            if (vendor) {
              vendorUserId = vendor.userId;
            }
          }

          if (vendorUserId) {
            io.to(`user_${vendorUserId}`).emit('ORDER_DISPATCH_EXPIRED', {
              orderId: order.orderId,
              message: 'No delivery partner accepted the order in time.',
            });
          }

          console.log(
            `Cron: Order ${order.orderId} reset and vendor notified.`,
          );
        }
      }
    } catch (error) {
      console.error('Error in Order Cron Job:', error);
    }
  });
};
