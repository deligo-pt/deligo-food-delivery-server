/* eslint-disable @typescript-eslint/no-explicit-any */
import { Job } from 'bullmq';
import mongoose from 'mongoose';
import { Order } from '../../modules/Order/order.model';
import { DeliveryPartner } from '../../modules/Delivery-Partner/delivery-partner.model';
import { PointsServices } from '../../modules/Points/points.service';
import { ReferralServices } from '../../modules/Referral/referral.service';
import { Wallet } from '../../modules/Wallet/wallet.model';
import { Admin } from '../../modules/Admin/admin.model';
import customNanoId from '../../utils/customNanoId';
import { Transaction } from '../../modules/Transaction/transaction.model';
import { Customer } from '../../modules/Customer/customer.model';
import { Vendor } from '../../modules/Vendor/vendor.model';
import { NotificationService } from '../../modules/Notification/notification.service';
import { roundTo2 } from '../../utils/mathProvider';
import { OrderPdService } from '../PdInvoice/orderPd.service';
import { recalculateCartTotals } from '../Cart/cart.constant';
import { RedisService } from '../../config/redis';
import { Cart } from '../Cart/cart.model';

export const processNewOrderPostProcess = async (job: Job) => {
  const {
    orderId,
    vendorUserId,
    orderDisplayId,
    grandTotal,
    lang = 'en',
    customerId,
    orderedItems,
  } = job.data;

  try {
    await OrderPdService.syncOrderWithPd(orderId, lang);

    if (vendorUserId) {
      await NotificationService.sendToUser(
        vendorUserId,
        'You have a new order',
        `New order ${orderDisplayId} received. Amount: ${grandTotal}`,
        { orderId: orderDisplayId },
        'order_notification',
        'ORDER',
      );
    }

    if (customerId && orderedItems && orderedItems.length > 0) {
      const cartDataKey = `cart:data:${customerId}`;

      const redisCart = await RedisService.get<any>(cartDataKey);
      if (redisCart && redisCart.items) {
        redisCart.items = redisCart.items.filter((cartItem: any) => {
          const isOrdered = orderedItems.some(
            (ordered: any) =>
              ordered.productId === cartItem.productId.toString() &&
              ordered.variationSku === (cartItem.variationSku || null),
          );
          return !isOrdered;
        });

        if (redisCart.items.length === 0) {
          await RedisService.del(cartDataKey);
          await RedisService.del(`cart:expiry:${customerId}`);
        } else {
          await recalculateCartTotals(redisCart);
          redisCart.totalItems = redisCart.items.length;
          await RedisService.set(cartDataKey, redisCart, 259200);
        }
      }

      const dbCart = await Cart.findOne({ customerId });
      if (dbCart && dbCart.items) {
        dbCart.items = dbCart.items.filter((cartItem: any) => {
          const isOrdered = orderedItems.some(
            (ordered: any) =>
              ordered.productId === cartItem.productId.toString() &&
              ordered.variationSku === (cartItem.variationSku || null),
          );
          return !isOrdered;
        });

        if (dbCart.items.length === 0) {
          dbCart.totalItems = 0;
          dbCart.cartCalculation = {
            totalOriginalPrice: 0,
            totalProductDiscount: 0,
            taxableAmount: 0,
            totalTaxAmount: 0,
            grandTotal: 0,
          };
        } else {
          await recalculateCartTotals(dbCart);
          dbCart.totalItems = dbCart.items.length;
        }
        await dbCart.save();
      }
    }
  } catch (error) {
    console.error(
      `[Worker] Error processing new order ${orderDisplayId}:`,
      error,
    );
    throw error;
  }
};

export const processOrderPostUpdate = async (job: Job) => {
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
      const vendorEarningsBeforeTax =
        payoutSummary?.vendor?.earningsWithoutTax || 0;
      const vendorPayableTax = payoutSummary?.vendor?.payableTax || 0;
      const vendorNetPayout = payoutSummary?.vendor?.vendorNetPayout || 0;
      const riderEarningsBeforeTax =
        payoutSummary?.rider?.earningsWithoutTax || 0;
      const riderPayableTax = payoutSummary?.rider?.payableTax || 0;
      const riderNetEarnings = payoutSummary?.rider?.riderNetEarnings || 0;
      const totalDeliveryCharge = delivery?.totalDeliveryCharge || 0;
      const deliGoCommission = payoutSummary?.deliGoCommission?.amount || 0;
      const commissionVat = payoutSummary?.deliGoCommission?.vatAmount || 0;
      const deliGoCommissionNet =
        payoutSummary?.deliGoCommission?.totalDeduction || 0;
      const earnedServiceCharge =
        payoutSummary?.deliGoCommission?.earnedServiceCharge || 0;
      const isManagedByFleet = partner?.registeredBy?.model === 'FleetManager';
      const fleetManagerId = isManagedByFleet
        ? partner?.registeredBy?.id
        : null;

      const totalPlatformEarnings =
        roundTo2(deliGoCommissionNet + earnedServiceCharge) || 0;
      const riderEarningAmount = isManagedByFleet
        ? riderNetEarnings
        : totalDeliveryCharge;

      // --- Vendor Wallet Update ---
      await Wallet.findOneAndUpdate(
        { userId: updatedOrder.vendorId, userModel: 'Vendor' },
        {
          $setOnInsert: { walletId: `WAL-V-${customNanoId(8)}` },
          $inc: {
            totalUnpaidTax: roundTo2(vendorPayableTax) || 0,
            totalTax: roundTo2(vendorPayableTax) || 0,
            totalUnpaidEarnings: roundTo2(vendorNetPayout) || 0,
            totalEarnings: roundTo2(vendorNetPayout) || 0,
          },
        },
        { session, upsert: true },
      );

      // --- Delivery Partner Wallet Update ---
      await Wallet.findOneAndUpdate(
        { userId: partner?._id, userModel: 'DeliveryPartner' },
        {
          $setOnInsert: { walletId: `WAL-D-${customNanoId(8)}` },
          $inc: {
            totalUnpaidTax: roundTo2(riderPayableTax) || 0,
            totalTax: roundTo2(riderPayableTax) || 0,
            totalUnpaidEarnings: roundTo2(riderEarningAmount) || 0,
            totalEarnings: roundTo2(riderEarningAmount) || 0,
          },
        },
        { session, upsert: true },
      );

      const SYSTEM_ADMIN = await Admin.findOne({ role: 'SUPER_ADMIN' })
        .select('_id')
        .lean();
      // Admin Wallet
      await Wallet.findOneAndUpdate(
        { userId: SYSTEM_ADMIN?._id, userModel: 'Admin' },
        {
          $setOnInsert: { walletId: `WAL-A-${customNanoId(8)}` },
          $inc: {
            totalUnpaidTax: roundTo2(commissionVat) || 0,
            totalTax: roundTo2(commissionVat) || 0,
            totalEarnings: roundTo2(totalPlatformEarnings) || 0,
          },
        },
        { session, upsert: true },
      );

      // Fleet Manager Wallet (If applicable)
      if (isManagedByFleet && fleetManagerId) {
        await Wallet.findOneAndUpdate(
          { userId: fleetManagerId, userModel: 'FleetManager' },
          {
            $setOnInsert: { walletId: `WAL-F-${customNanoId(8)}` },
            $inc: {
              totalUnpaidEarnings: totalDeliveryCharge || 0,
              totalRiderPayable: riderNetEarnings || 0,
              totalFleetEarnings: payoutSummary.fleet.fee || 0,
              totalEarnings: totalDeliveryCharge || 0,
            },
          },
          { session, upsert: true },
        );
      }

      // --- Transaction Records ---
      const transactionsToCreate = [
        {
          transactionId: `TXN-V-${orderDisplayId}`,
          orderId: orderDbId,
          userId: updatedOrder.vendorId,
          userModel: 'Vendor',
          baseAmount: roundTo2(vendorEarningsBeforeTax),
          taxAmount: roundTo2(vendorPayableTax),
          totalAmount: roundTo2(vendorNetPayout),
          type: 'VENDOR_EARNING',
          status: 'SUCCESS',
          paymentMethod: 'WALLET',
          remarks: `Earnings for Order: ${orderDisplayId}`,
        },
        {
          transactionId: `TXN-DP-${orderDisplayId}`,
          orderId: orderDbId,
          userId: partner._id,
          userModel: 'DeliveryPartner',
          baseAmount: roundTo2(riderEarningsBeforeTax),
          taxAmount: roundTo2(riderPayableTax),
          totalAmount: roundTo2(riderEarningAmount),
          type: 'DELIVERY_PARTNER_EARNING',
          status: 'SUCCESS',
          paymentMethod: 'WALLET',
          remarks: isManagedByFleet
            ? 'Fleet Managed Earning'
            : 'Direct Earning',
        },
        {
          transactionId: `TXN-DELIGO-${orderDisplayId}`,
          orderId: orderDbId,
          userId: SYSTEM_ADMIN?._id,
          userModel: 'Admin',
          baseAmount: roundTo2(deliGoCommission),
          taxAmount: roundTo2(commissionVat),
          totalAmount: roundTo2(totalPlatformEarnings),
          type: 'PLATFORM_COMMISSION',
          status: 'SUCCESS',
          paymentMethod: 'WALLET',
          remarks: `Commission from Order: ${orderDisplayId}`,
        },
      ];

      if (isManagedByFleet && fleetManagerId) {
        transactionsToCreate.push({
          transactionId: `TXN-F-${orderDisplayId}`,
          orderId: orderDbId,
          userId: fleetManagerId,
          userModel: 'FleetManager',
          baseAmount: roundTo2(totalDeliveryCharge),
          taxAmount: 0,
          totalAmount: roundTo2(totalDeliveryCharge),
          type: 'FLEET_EARNING',
          status: 'SUCCESS',
          paymentMethod: 'WALLET',
          remarks: `Managed Revenue for Order: ${orderDisplayId}`,
        });
      }

      await Transaction.insertMany(transactionsToCreate, { session });

      const pickupTime = updatedOrder.pickedUpAt
        ? new Date(updatedOrder.pickedUpAt).getTime()
        : Date.now();
      const deliveryTime = new Date().getTime();
      const durationMinutes = Math.max(
        1,
        Math.round((deliveryTime - pickupTime) / 60000),
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
        {
          session,
        },
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

    const customer = await Customer.findById(updatedOrder.customerId).lean();
    const customerId = customer?.userId;
    const vendor = await Vendor.findById(updatedOrder.vendorId).lean();
    const vendorId = vendor?.userId;

    const notificationPayload = {
      title: `Order is now ${orderStatus}`,
      body: `${
        orderStatus === 'PICKED_UP' // TODO: Notify Customer
          ? `Your order ${orderDisplayId} is now PICKED_UP.`
          : orderStatus === 'ON_THE_WAY'
            ? `Your order ${orderDisplayId} is now ON_THE_WAY.`
            : orderStatus === 'DELIVERED'
              ? `Your order ${orderDisplayId} is  DELIVERED. Please leave a review.`
              : `Your order ${orderDisplayId} is  ${orderStatus}.`
      } `,
      data: {
        orderId: orderDisplayId,
        orderStatus: orderStatus,
        type: 'ORDER_STATUS',
      },
    };
    if (customerId) {
      NotificationService.sendToUser(
        customerId,
        notificationPayload.title,
        notificationPayload.body,
        notificationPayload.data,
        'default',
        'ORDER',
      );
    }
    if (
      vendorId &&
      (orderStatus === 'ON_THE_WAY' || orderStatus === 'DELIVERED')
    ) {
      NotificationService.sendToUser(
        vendorId!,
        notificationPayload.title,
        `${
          orderStatus === 'ON_THE_WAY'
            ? `Order ${orderDisplayId} is now ${orderStatus}`
            : orderStatus === 'DELIVERED' &&
              `Order ${orderDisplayId} is successfully ${orderStatus} by delivery partner`
        }`,
        notificationPayload.data,
        'default',
        'ORDER',
      );
    }
  } catch (error) {
    await session.abortTransaction();
    console.error(`[Worker] Failed to process order ${orderDisplayId}:`, error);
    throw error; // BullMQ will retry based on config
  } finally {
    session.endSession();
  }
};
