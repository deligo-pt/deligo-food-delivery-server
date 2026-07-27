/* eslint-disable @typescript-eslint/no-explicit-any */
import { Order } from '../modules/Order/order.model';
import { getIO } from '../lib/Socket';
import { Vendor } from '../modules/Vendor/vendor.model';
import { ORDER_STATUS } from '../modules/Order/order.constant';

export const handleOrderExpiryCron = async () => {
  try {
    const now = new Date();

    const expiredOrders = await Order.find({
      orderStatus: ORDER_STATUS.DISPATCHING,
      dispatchExpiresAt: { $lt: now },
      isDeleted: false,
    }).populate('vendorId');

    if (expiredOrders.length > 0) {
      const io = getIO();

      for (const order of expiredOrders) {
        await Order.updateOne(
          { _id: order._id, orderStatus: ORDER_STATUS.DISPATCHING },
          {
            $set: {
              orderStatus: ORDER_STATUS.AWAITING_PARTNER,
              dispatchPartnerPool: [],
            },
            $push: {
              statusHistory: {
                status: ORDER_STATUS.AWAITING_PARTNER,
                timestamp: new Date(),
                note: 'Dispatch time expired. Waiting for delivery partner reassignment.',
              },
            },
          },
        );

        if (
          Array.isArray(order.dispatchPartnerPool) &&
          order.dispatchPartnerPool.length > 0
        ) {
          order.dispatchPartnerPool.forEach((partnerPoolId) => {
            io.to(`partner_pool_${partnerPoolId}`).emit('REMOVE_ORDER_POPUP', {
              orderId: order.orderId,
            });
          });
        }

        let vendorUserId = '';
        if (
          typeof order.vendorId === 'object' &&
          (order.vendorId as any).userId
        ) {
          vendorUserId = (order.vendorId as any).userId;
        } else if (order.vendorId) {
          const vendor = await Vendor.findById(order.vendorId).select('userId');
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
      }
    }
  } catch (error) {
    console.error('Error in Order Expiry Cron Job:', error);
  }
};
