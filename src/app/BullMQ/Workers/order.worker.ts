import { Worker, Job } from 'bullmq';
import mongoose from 'mongoose';
import { queueConnection } from '../../config/bullmq';
import { Order } from '../../modules/Order/order.model';
import { DeliveryPartner } from '../../modules/Delivery-Partner/delivery-partner.model';
import { PointsServices } from '../../modules/Points/points.service';
import { ReferralServices } from '../../modules/Referral/referral.service';
import { Wallet } from '../../modules/Wallet/wallet.model';
import { Admin } from '../../modules/Admin/admin.model';

const roundTo2 = (num: number) => +(Math.round(Number(num + 'e+2')) + 'e-2');

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
      if (!partner) throw new Error('Delivery Partner not found');

      // ১. পয়েন্ট এবং রেফারেল বোনাস (Points and Referral)
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

      const { payoutSummary, delivery } = updatedOrder;
      const isManagedByFleet = partner?.registeredBy?.model === 'FleetManager';
      // const fleetManagerId = isManagedByFleet
      //   ? partner?.registeredBy?.id
      //   : null;

      const riderNetEarnings = payoutSummary?.rider?.riderNetEarnings || 0;
      const totalDeliveryCharge = delivery?.totalDeliveryCharge || 0;
      const riderEarningAmount = isManagedByFleet
        ? riderNetEarnings
        : totalDeliveryCharge;

      // Vendor Wallet
      await Wallet.findOneAndUpdate(
        { userId: updatedOrder.vendorId, userModel: 'Vendor' },
        {
          $inc: {
            totalUnpaidEarnings: roundTo2(
              payoutSummary?.vendor?.vendorNetPayout || 0,
            ),
            totalEarnings: roundTo2(
              payoutSummary?.vendor?.vendorNetPayout || 0,
            ),
          },
        },
        { session, upsert: true },
      );

      // Delivery Partner Wallet
      await Wallet.findOneAndUpdate(
        { userId: partner._id, userModel: 'DeliveryPartner' },
        {
          $inc: {
            totalUnpaidEarnings: roundTo2(riderEarningAmount),
            totalEarnings: roundTo2(riderEarningAmount),
          },
        },
        { session, upsert: true },
      );

      // Admin Wallet
      const SYSTEM_ADMIN = await Admin.findOne({ role: 'SUPER_ADMIN' })
        .select('_id')
        .lean();
      await Wallet.findOneAndUpdate(
        { userId: SYSTEM_ADMIN?._id, userModel: 'Admin' },
        {
          $inc: {
            totalEarnings: roundTo2(
              payoutSummary?.deliGoCommission?.totalDeduction || 0,
            ),
          },
        },
        { session, upsert: true },
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
    console.log(`[Worker] Successfully processed order: ${orderDisplayId}`);
  } catch (error) {
    await session.abortTransaction();
    console.error(`[Worker] Failed to process order ${orderDisplayId}:`, error);
    throw error; // BullMQ will retry based on config
  } finally {
    session.endSession();
  }
};

export const orderWorker = new Worker(
  'order-queue',
  async (job: Job) => {
    if (job.name === 'PROCESS_ORDER_POST_UPDATE') {
      await processOrderPostUpdate(job);
    }
  },
  { connection: queueConnection, concurrency: 5 },
);
