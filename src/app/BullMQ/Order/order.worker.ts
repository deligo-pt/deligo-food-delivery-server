import { Worker, Job } from 'bullmq';
import mongoose from 'mongoose';
import { queueConnection } from '../../config/bullmq';
import { Order } from '../../modules/Order/order.model';
import { DeliveryPartner } from '../../modules/Delivery-Partner/delivery-partner.model';
import { PointsServices } from '../../modules/Points/points.service';
import { ReferralServices } from '../../modules/Referral/referral.service';

const processOrderPostUpdate = async (job: Job) => {
  const { orderDbId, orderStatus, partnerUserId, orderDisplayId } = job.data;

  const updatedOrder = await Order.findById(orderDbId).populate(
    'customerId vendorId',
  );
  if (!updatedOrder) return;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    if (orderStatus === 'DELIVERED') {
      const partner = await DeliveryPartner.findOne({ userId: partnerUserId });
      if (!partner) throw new Error('Partner not found');

      await PointsServices.addOrderPoints(
        updatedOrder.customerId._id,
        updatedOrder._id.toString(),
        session,
      );
      if (updatedOrder.deliveryPartnerId) {
        await PointsServices.addDeliveryPartnerPoints(
          updatedOrder.deliveryPartnerId,
          updatedOrder._id.toString(),
          session,
        );
      }
      await ReferralServices.distributeReferralBonus(
        updatedOrder.customerId._id.toString(),
        updatedOrder._id.toString(),
        session,
      );

      const pickupTime = updatedOrder.pickedUpAt
        ? new Date(updatedOrder.pickedUpAt).getTime()
        : Date.now();
      const durationMinutes = Math.max(
        1,
        Math.round((Date.now() - pickupTime) / 60000),
      );

      await DeliveryPartner.updateOne(
        { userId: partnerUserId },
        {
          $set: {
            'operationalData.currentOrderId': null,
            'operationalData.currentStatus': 'IDLE',
          },
          $inc: {
            'operationalData.totalDeliveries': 1,
            'operationalData.completedDeliveries': 1,
            'operationalData.totalDeliveryMinutes': durationMinutes,
          },
        },
        { session },
      );
    } else if (orderStatus === 'REASSIGNMENT_NEEDED') {
      await DeliveryPartner.updateOne(
        { userId: partnerUserId },
        {
          $set: {
            'operationalData.currentOrderId': null,
            'operationalData.currentStatus': 'IDLE',
          },
          $inc: {
            'operationalData.canceledDeliveries': 1,
            'operationalData.totalRejectedOrders': 1,
          },
        },
        { session },
      );
    }

    await session.commitTransaction();
    console.log(`[Worker] Post-processing finished for: ${orderDisplayId}`);
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

// ওয়ার্কার লিসেনার এক্সপোর্ট
export const orderWorker = new Worker(
  'order-queue',
  async (job: Job) => {
    switch (job.name) {
      case 'PROCESS_ORDER_POST_UPDATE':
        await processOrderPostUpdate(job);
        break;
    }
  },
  { connection: queueConnection, concurrency: 5 },
);
