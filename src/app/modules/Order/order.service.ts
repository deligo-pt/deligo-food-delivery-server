/* eslint-disable @typescript-eslint/no-explicit-any */
import httpStatus from 'http-status';
import { TCurrentUser } from '../../constant/GlobalInterface/user.interface';
import AppError from '../../errors/AppError';
import { Order } from './order.model';
import { QueryBuilder } from '../../builder/QueryBuilder';
import {
  BLOCKED_FOR_ORDER_CANCEL,
  DELIVERY_SEARCH_TIERS_METERS,
  ORDER_STATUS,
  OrderSearchableFields,
  OrderStatus,
  REFUND_STATUS,
} from './order.constant';
import { DeliveryPartner } from '../Delivery-Partner/delivery-partner.model';
import { CheckoutSummary } from '../Checkout/checkout.model';
import { Product } from '../Product/product.model';
import mongoose, { Types } from 'mongoose';
import { TDeliveryPartner } from '../Delivery-Partner/delivery-partner.interface';
import { NotificationService } from '../Notification/notification.service';
import { Customer } from '../Customer/customer.model';
import { getPopulateOptions } from '../../utils/getPopulateOptions';
import { Vendor } from '../Vendor/vendor.model';
import { getIO } from '../../lib/Socket';
import { emitOrderStatusUpdate } from '../../lib/Socket/orderSocket';
import axios from 'axios';
import config from '../../config';
import { Transaction } from '../Transaction/transaction.model';
import { orderQueue } from '../../BullMQ/Queue/order.queue';
import { TLanguageCode } from '../../constant/GlobalInterface/language.interface';
import { BusinessCategoryName } from '../Category/category.interface';
import customNanoId from '../../utils/customNanoId';
import { CartServices } from '../Cart/cart.service';
import { updateOrderStatusHistory } from './order.utils';
import { PaymentTokenServices } from '../Payment-Token/payment-token.service';

// one-click flow (Payment module's payWithSavedToken, verified via doPaymentToken's
const finalizeCheckoutIntoOrder = async (
  summary: any,
  existingVendor: { _id: any; userId: string },
  transactionId: string,
  currentUser: TCurrentUser,
  lang: TLanguageCode = 'en',
  deliveryNotes?: string,
) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    summary.$session(session);

    const uniqueOrderId = customNanoId(10);

    const orderData = {
      orderId: `ORD-${uniqueOrderId}`,
      customerId: summary.customerId,
      vendorId: summary.vendorId,
      items: summary.items,
      totalItems: summary.totalItems,
      totalQuantity: summary.totalQuantity,
      orderCalculation: {
        totalOriginalPrice: summary.orderCalculation.totalOriginalPrice,
        totalProductDiscount: summary.orderCalculation.totalProductDiscount,
        totalOfferDiscount: summary.orderCalculation.totalOfferDiscount,
        totalTaxAmount: summary.orderCalculation.totalTaxAmount,
        itemsSubtotal: summary.orderCalculation.itemsSubtotal,
        serviceCharge: summary.orderCalculation.serviceCharge,
        serviceChargeVatRate:
          (summary.orderCalculation as any).serviceChargeVatRate ?? 23,
        serviceChargeVatAmount:
          (summary.orderCalculation as any).serviceChargeVatAmount ?? 0,
      },
      delivery: {
        charge: summary.delivery.charge,
        vatRate: summary.delivery.vatRate,
        vatAmount: summary.delivery.vatAmount,
        totalDeliveryCharge: summary.delivery.totalDeliveryCharge,
        distance: summary.delivery.distance,
        estimatedTime: summary.delivery.estimatedTime,
        notes: deliveryNotes || '',
      },
      payoutSummary: {
        grandTotal: summary.payoutSummary.grandTotal,
        deliGoCommission: summary.payoutSummary.deliGoCommission,
        fleet: summary.payoutSummary.fleet,
        vendor: summary.payoutSummary.vendor,
        rider: summary.payoutSummary.rider,
      },
      offer: {
        isApplied: summary.offer.isApplied,
        offerApplied: summary.offer.offerApplied,
      },
      paymentMethod: summary.paymentMethod || 'CARD',
      paymentStatus: 'PAID',
      transactionId: transactionId,
      isPaid: true,
      deliveryAddress: summary.deliveryAddress,
      orderStatus: 'PENDING',
      statusHistory: [
        {
          status: ORDER_STATUS.PENDING,
          timestamp: new Date(),
          updatedBy: currentUser._id,
          note: 'Order placed and payment verified successfully.',
        },
      ],
      isDeleted: false,
    };

    const [order] = await Order.create([orderData], { session });

    await Transaction.create(
      [
        {
          transactionId: transactionId,
          orderId: order._id,
          userId: currentUser?._id,
          userModel: 'Customer',
          totalAmount: order.payoutSummary.grandTotal,
          type: 'ORDER_PAYMENT',
          status: 'SUCCESS',
          paymentMethod: order.paymentMethod,
          remarks: `Order payment successful for Order ID: ${order.orderId}`,
        },
      ],
      { session },
    );

    summary.isConvertedToOrder = true;
    summary.paymentStatus = 'PAID';
    summary.transactionId = transactionId;
    summary.orderId = order._id as any;
    await summary.save({ session });

    await session.commitTransaction();

    const orderedItemsPayload = summary.items.map((i: any) => ({
      productId: i.productId.toString(),
      variationSku: i.variationSku || null,
    }));

    await orderQueue.add('NEW_ORDER_POST_PROCESS', {
      orderId: order._id.toString(),
      vendorId: existingVendor._id.toString(),
      vendorUserId: existingVendor.userId,
      orderDisplayId: order.orderId,
      grandTotal: order.payoutSummary.grandTotal,
      lang: lang,
      customerId: summary.customerId.toString(),
      orderedItems: orderedItemsPayload,
    });

    return {
      messageKey: 'ORDER_CREATED_SUCCESS',
      data: order,
    };
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
};

// Create Order after redUniq payment (hosted-page / redirect checkout flow)
const createOrderAfterRedUniqPayment = async (
  payload: {
    checkoutSummaryId: string;
    paymentToken: string;
    deliveryNotes?: string;
  },
  currentUser: TCurrentUser,
  lang: TLanguageCode = 'en',
) => {
  const { checkoutSummaryId, paymentToken, deliveryNotes } = payload;

  const summary = await CheckoutSummary.findById(checkoutSummaryId);
  if (!summary)
    throw new AppError(httpStatus.NOT_FOUND, 'CHECKOUT_SUMMARY_NOT_FOUND');

  if (summary.customerId.toString() !== currentUser._id.toString()) {
    throw new AppError(httpStatus.FORBIDDEN, 'UNAUTHORIZED_TO_VIEW');
  }

  if (summary.isConvertedToOrder) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'CHECKOUT_SUMMARY_ALREADY_CONVERTED',
    );
  }

  const existingVendor = await Vendor.findById(summary.vendorId).lean();
  if (!existingVendor) {
    throw new AppError(httpStatus.NOT_FOUND, 'VENDOR_NOT_FOUND');
  }

  const verifyPayload = {
    method: 'getResult',
    api: {
      username: config.redUniq.username,
      password: config.redUniq.password,
    },
    token: paymentToken,
  };

  const verifyRes = await axios.post(
    config.redUniq.api_url as string,
    verifyPayload,
  );
  const paymentData = verifyRes.data;

  if (
    !paymentData ||
    !paymentData.transaction ||
    paymentData.transaction.status !== '4'
  ) {
    throw new AppError(httpStatus.BAD_REQUEST, 'PAYMENT_FAILED_TRY_AGAIN');
  }

  const transactionId = paymentData.transaction.id;

  if (summary.paymentMethod === 'CARD') {
    await PaymentTokenServices.persistCardTokenFromGatewayResponse(
      summary.customerId.toString(),
      checkoutSummaryId,
      paymentData,
    ).catch((err) => console.error('Card token persistence failed:', err));
  }

  return finalizeCheckoutIntoOrder(
    summary,
    existingVendor,
    transactionId,
    currentUser,
    lang,
    deliveryNotes,
  );
};

// update order status by vendor (accept / reject / preparing / cancel)
const updateOrderStatusByVendor = async (
  currentUser: TCurrentUser,
  orderId: string,
  action: { type: any; reason?: string },
) => {
  // 1. Authorization & Role Check
  if (!currentUser || currentUser.role !== 'VENDOR') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'NOT_AUTHORIZED_ACCEPT_REJECT_ORDERS',
    );
  }

  if (currentUser.status !== 'APPROVED') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'NOT_APPROVED_ACCEPT_REJECT_ORDERS',
      { status: currentUser.status },
    );
  }

  const ALLOWED_VENDOR_ACTIONS = [
    'ACCEPTED',
    'REJECTED',
    'PREPARING',
    'READY_FOR_PICKUP',
    'CANCELED',
  ];

  if (!ALLOWED_VENDOR_ACTIONS.includes(action.type)) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'NOT_ALLOWED_TO_CHANGE_ORDER_STATUS',
      { status: action.type },
    );
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  // Notifications stack for firing after commit
  const notificationsToEmit: Array<() => Promise<void>> = [];

  try {
    const order = await Order.findOne(
      {
        orderId,
        vendorId: currentUser._id,
        isDeleted: false,
      },
      null,
      { session },
    ).populate({
      path: 'vendorId',
      select: '_id businessDetails businessLocation',
      populate: {
        path: 'businessDetails.businessType',
      },
    });

    if (!order) {
      throw new AppError(httpStatus.NOT_FOUND, 'ORDER_NOT_FOUND');
    }

    const vendor = order.vendorId as any;
    const isRestaurant =
      vendor?.businessDetails?.businessType?.name?.en ===
      BusinessCategoryName.RESTAURANT;
    const shouldCheckStock = !isRestaurant;

    if (!order.isPaid) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'ONLY_PAID_ORDER_CAN_ACCEPT_REJECT',
      );
    }

    if (action.type === order.orderStatus) {
      throw new AppError(httpStatus.BAD_REQUEST, 'ORDER_ALREADY_IN_STATUS', {
        status: action.type,
      });
    }

    const customer = await Customer.findById(order.customerId, null, {
      session,
    });
    const customerId = customer?.userId;

    const deliveryPartner = order.deliveryPartnerId
      ? await DeliveryPartner.findById(order.deliveryPartnerId, null, {
          session,
        })
      : null;
    const deliveryPartnerId = deliveryPartner?.userId;

    const previousStatus = order.orderStatus; // Old status

    if (action.type === 'ACCEPTED') {
      const ALLOWED_PREVIOUS_STATUS_FOR_ACCEPT = ['PENDING', 'REJECTED'];
      if (!ALLOWED_PREVIOUS_STATUS_FOR_ACCEPT.includes(order.orderStatus)) {
        throw new AppError(
          httpStatus.BAD_REQUEST,
          'CANNOT_ACCEPT_ORDER_FROM_CURRENT_STATUS',
          { currentStatus: order.orderStatus },
        );
      }
    }

    if (action.type === 'REJECTED') {
      if (order.orderStatus !== 'PENDING') {
        throw new AppError(
          httpStatus.BAD_REQUEST,
          'CANNOT_REJECT_ACCEPTED_ORDER_USE_CANCEL_INSTEAD',
        );
      }
    }

    if (action.type === 'CANCELED') {
      if (order.deliveryPartnerId) {
        throw new AppError(
          httpStatus.BAD_REQUEST,
          'CANNOT_CANCEL_ORDER_RIDER_ALREADY_ASSIGNED',
        );
      }
    }

    if (
      action.type === ORDER_STATUS.PREPARING &&
      order.orderStatus !== ORDER_STATUS.ASSIGNED
    ) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'ORDER_MUST_BE_ASSIGNED_BEFORE_PREPARING',
      );
    }

    if (
      action.type === ORDER_STATUS.READY_FOR_PICKUP &&
      order.orderStatus !== ORDER_STATUS.PREPARING
    ) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'ORDER_MUST_BE_PREPARING_BEFORE_READY_FOR_PICKUP',
      );
    }

    if (
      (action.type === 'REJECTED' || action.type === 'CANCELED') &&
      BLOCKED_FOR_ORDER_CANCEL.some((status) => order.orderStatus === status)
    ) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'ORDER_CANNOT_BE_CANCELED_OR_REJECTED_AT_STAGE',
      );
    }

    // ---------------------------------------------------------
    // ACTION: ACCEPTED
    // ---------------------------------------------------------
    if (action.type === 'ACCEPTED') {
      if (!order.pickupAddress) {
        order.pickupAddress = {
          street: vendor?.businessLocation?.street || '',
          city: vendor?.businessLocation?.city || '',
          state: vendor?.businessLocation?.state || '',
          country: vendor?.businessLocation?.country || '',
          postalCode: vendor?.businessLocation?.postalCode || '',
          longitude: vendor?.businessLocation?.longitude || 0,
          latitude: vendor?.businessLocation?.latitude || 0,
          geoAccuracy: vendor?.businessLocation?.geoAccuracy,
          detailedAddress: vendor?.businessLocation?.detailedAddress || '',
        };
      }

      if (shouldCheckStock) {
        const stockOperations = order.items.map((item: any) => {
          const targetProductId = item.productId?._id || item.productId;

          if (item.variationSku) {
            return {
              updateOne: {
                filter: {
                  _id: new mongoose.Types.ObjectId(targetProductId),
                  'variations.options.sku': item.variationSku,
                  'variations.options.stockQuantity': {
                    $gte: item.itemSummary.quantity,
                  },
                },
                update: {
                  $inc: {
                    'variations.options.$[elem].stockQuantity':
                      -item.itemSummary.quantity,
                  },
                },
                arrayFilters: [{ 'elem.sku': item.variationSku }],
              },
            };
          }

          return {
            updateOne: {
              filter: {
                _id: new mongoose.Types.ObjectId(targetProductId),
                'stock.quantity': { $gte: item.itemSummary.quantity },
              },
              update: {
                $inc: { 'stock.quantity': -item.itemSummary.quantity },
              },
            },
          };
        });

        const stockResult = await Product.bulkWrite(stockOperations, {
          session,
        });
        if (stockResult.modifiedCount !== order.items.length) {
          throw new AppError(httpStatus.BAD_REQUEST, 'INSUFFICIENT_STOCK');
        }
      }

      if (customerId) {
        notificationsToEmit.push(async () => {
          NotificationService.sendToUser(
            customerId,
            'Order Accepted',
            `Your order has been accepted by ${vendor?.businessDetails?.businessName || 'the store'}. Please wait for pickup updates.`,
            { orderId: order.orderId },
            'default',
            'ORDER',
          );
        });
      }
    }

    // ---------------------------------------------------------
    // ACTION: PREPARING
    // ---------------------------------------------------------
    if (action.type === ORDER_STATUS.PREPARING) {
      if (customerId) {
        notificationsToEmit.push(async () => {
          NotificationService.sendToUser(
            customerId,
            'Order is being prepared',
            `Your order is now being prepared by ${vendor?.businessDetails?.businessName || 'the store'}.`,
            { orderId: order.orderId, status: ORDER_STATUS.PREPARING },
            'default',
            'ORDER',
          );
        });
      }
    }

    // ---------------------------------------------------------
    // ACTION: READY_FOR_PICKUP
    // ---------------------------------------------------------
    if (action.type === ORDER_STATUS.READY_FOR_PICKUP) {
      if (customerId) {
        notificationsToEmit.push(async () => {
          NotificationService.sendToUser(
            customerId,
            'Order is ready for pickup',
            `Your order is now ready for pickup by ${vendor?.businessDetails?.businessName || 'the store'}.`,
            { orderId: order.orderId, status: ORDER_STATUS.READY_FOR_PICKUP },
            'default',
            'ORDER',
          );
        });
      }
    }

    // ---------------------------------------------------------
    // ACTION: CANCELED
    // ---------------------------------------------------------
    if (action.type === 'CANCELED') {
      if (!action.reason) {
        throw new AppError(httpStatus.BAD_REQUEST, 'CANCEL_REASON_REQUIRED');
      }
      order.cancelReason = action.reason;
      order.refundStatus = REFUND_STATUS.PENDING;

      // Restore stock if it was deducted previously
      const STAGES_WHERE_STOCK_WAS_DEDUCTED = [
        'ACCEPTED',
        'AWAITING_PARTNER',
        'DISPATCHING',
        'ASSIGNED',
        'PREPARING',
        'READY_FOR_PICKUP',
      ];

      if (
        shouldCheckStock &&
        STAGES_WHERE_STOCK_WAS_DEDUCTED.includes(previousStatus)
      ) {
        const stockOperations = order.items.map((item: any) => {
          const targetProductId = item.productId?._id || item.productId;

          if (item.variationSku) {
            return {
              updateOne: {
                filter: {
                  _id: new mongoose.Types.ObjectId(targetProductId),
                  'variations.options.sku': item.variationSku,
                },
                update: {
                  $inc: {
                    'variations.options.$[elem].stockQuantity':
                      item.itemSummary.quantity,
                  },
                },
                arrayFilters: [{ 'elem.sku': item.variationSku }],
              },
            };
          }

          return {
            updateOne: {
              filter: { _id: new mongoose.Types.ObjectId(targetProductId) },
              update: {
                $inc: { 'stock.quantity': item.itemSummary.quantity },
              },
            },
          };
        });
        await Product.bulkWrite(stockOperations, { session });
      }

      const notificationPayload = {
        title: 'Order Canceled',
        body: `Your order has been canceled for: ${action.reason}`,
        data: { orderId: order.orderId },
      };

      if (customerId) {
        notificationsToEmit.push(async () => {
          NotificationService.sendToUser(
            customerId,
            notificationPayload.title,
            notificationPayload.body,
            notificationPayload.data,
            'default',
            'ORDER',
          );
        });
      }
    }

    // ---------------------------------------------------------
    // ACTION: REJECTED
    // ---------------------------------------------------------
    if (action.type === 'REJECTED') {
      if (!action.reason) {
        throw new AppError(httpStatus.BAD_REQUEST, 'REJECT_REASON_REQUIRED');
      }
      order.rejectReason = action.reason;
      order.refundStatus = REFUND_STATUS.PENDING;

      if (customerId) {
        notificationsToEmit.push(async () => {
          NotificationService.sendToUser(
            customerId,
            'Order Rejected',
            `Your order has been rejected for: ${action.reason}`,
            { orderId: order.orderId },
            'default',
            'ORDER',
          );
        });
      }
    }

    // Update Status and Save
    order.orderStatus = action.type;

    updateOrderStatusHistory({
      order,
      newStatus: action.type,
      updatedBy: currentUser._id,
      note: action.reason,
    });

    await order.save({ session });

    // Commit Transaction safely
    await session.commitTransaction();

    // Fire notifications asynchronously after DB commit succeeds
    Promise.allSettled(notificationsToEmit.map((fn) => fn())).catch((err) =>
      console.error('Notification dispatch failed:', err),
    );

    // Emit socket update safely
    try {
      emitOrderStatusUpdate(getIO(), {
        orderId: order.orderId,
        orderStatus: action.type,
        order: order.toObject(),
        customerUserId: customerId || null,
        vendorUserId: (order.vendorId as any)?.userId || null,
        deliveryPartnerUserId: deliveryPartnerId || null,
      });
    } catch (socketErr) {
      console.error('Socket emission failed:', socketErr);
    }

    return {
      messageKey: 'ORDER_STATUS_UPDATED_SUCCESS_DYNAMIC',
      variables: { status: action.type },
      data: order,
      // Vendor-initiated cancel/reject always refunds the customer, regardless of stage.
      shouldRefund: action.type === 'CANCELED' || action.type === 'REJECTED',
    };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

// cancel order by customer (refunded only if canceled before vendor accepts)
const cancelOrderByCustomer = async (
  currentUser: TCurrentUser,
  orderId: string,
  reason: string,
) => {
  if (!currentUser || currentUser.role !== 'CUSTOMER') {
    throw new AppError(httpStatus.FORBIDDEN, 'NOT_AUTHORIZED_TO_CANCEL_ORDER');
  }

  if (!reason) {
    throw new AppError(httpStatus.BAD_REQUEST, 'CANCEL_REASON_REQUIRED');
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  const notificationsToEmit: Array<() => Promise<void>> = [];

  try {
    const order = await Order.findOne(
      {
        orderId,
        customerId: currentUser._id,
        isDeleted: false,
      },
      null,
      { session },
    ).populate({
      path: 'vendorId',
      select: '_id userId businessDetails',
      populate: {
        path: 'businessDetails.businessType',
      },
    });

    if (!order) {
      throw new AppError(httpStatus.NOT_FOUND, 'ORDER_NOT_FOUND');
    }

    if (!order.isPaid) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'ONLY_PAID_ORDER_CAN_BE_CANCELED',
      );
    }

    // A customer can cancel at any point before delivery; only the refund
    // eligibility and who gets notified change depending on the stage.
    const NON_CANCELABLE_STATUSES = [
      ORDER_STATUS.CANCELED,
      ORDER_STATUS.REJECTED,
      ORDER_STATUS.DELIVERED,
    ];

    if (NON_CANCELABLE_STATUSES.some((status) => order.orderStatus === status)) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'ORDER_CANNOT_BE_CANCELED_OR_REJECTED_AT_STAGE',
      );
    }

    const previousStatus = order.orderStatus;
    // Only refund if the vendor has not yet accepted the order.
    const shouldRefund = previousStatus === ORDER_STATUS.PENDING;

    // Stage buckets that drive who gets notified about the cancellation.
    const BEFORE_ASSIGNED_STATUSES = [
      ORDER_STATUS.PENDING,
      ORDER_STATUS.ACCEPTED,
      ORDER_STATUS.AWAITING_PARTNER,
      ORDER_STATUS.DISPATCHING,
      ORDER_STATUS.REASSIGNMENT_NEEDED,
    ];
    const BEFORE_PICKUP_STATUSES = [
      ORDER_STATUS.ASSIGNED,
      ORDER_STATUS.PREPARING,
      ORDER_STATUS.READY_FOR_PICKUP,
    ];

    const isBeforeAssigned = BEFORE_ASSIGNED_STATUSES.some(
      (status) => previousStatus === status,
    );
    const isBeforePickup = BEFORE_PICKUP_STATUSES.some(
      (status) => previousStatus === status,
    );
    // Anything else at this point is PICKED_UP / ON_THE_WAY (after pickup).
    const notifyVendor = isBeforeAssigned || isBeforePickup;
    const notifyRider = isBeforePickup || !isBeforeAssigned;

    const vendor = order.vendorId as any;
    const isRestaurant =
      vendor?.businessDetails?.businessType?.name?.en ===
      BusinessCategoryName.RESTAURANT;
    const shouldCheckStock = !isRestaurant;

    order.cancelReason = reason;
    order.refundStatus = shouldRefund
      ? REFUND_STATUS.PENDING
      : REFUND_STATUS.NOT_APPLICABLE;

    // Restore stock if it was deducted previously (i.e. vendor already accepted)
    // and the food hasn't already been picked up by the rider.
    const STAGES_WHERE_STOCK_WAS_DEDUCTED = [
      'ACCEPTED',
      'AWAITING_PARTNER',
      'DISPATCHING',
      'REASSIGNMENT_NEEDED',
      'ASSIGNED',
      'PREPARING',
      'READY_FOR_PICKUP',
    ];

    if (
      shouldCheckStock &&
      STAGES_WHERE_STOCK_WAS_DEDUCTED.includes(previousStatus)
    ) {
      const stockOperations = order.items.map((item: any) => {
        const targetProductId = item.productId?._id || item.productId;

        if (item.variationSku) {
          return {
            updateOne: {
              filter: {
                _id: new mongoose.Types.ObjectId(targetProductId),
                'variations.options.sku': item.variationSku,
              },
              update: {
                $inc: {
                  'variations.options.$[elem].stockQuantity':
                    item.itemSummary.quantity,
                },
              },
              arrayFilters: [{ 'elem.sku': item.variationSku }],
            },
          };
        }

        return {
          updateOne: {
            filter: { _id: new mongoose.Types.ObjectId(targetProductId) },
            update: {
              $inc: { 'stock.quantity': item.itemSummary.quantity },
            },
          },
        };
      });
      await Product.bulkWrite(stockOperations, { session });
    }

    // If a rider is already assigned, free them up so they aren't stuck
    // "busy" on an order that no longer exists.
    const deliveryPartner = order.deliveryPartnerId
      ? await DeliveryPartner.findById(order.deliveryPartnerId, null, {
          session,
        })
      : null;
    const deliveryPartnerUserId = deliveryPartner?.userId;

    if (deliveryPartner) {
      await DeliveryPartner.updateOne(
        { _id: deliveryPartner._id },
        {
          $set: {
            'operationalData.currentOrderId': null,
            'operationalData.currentStatus': 'IDLE',
          },
          $inc: { 'operationalData.canceledDeliveries': 1 },
        },
        { session },
      );
    }

    updateOrderStatusHistory({
      order,
      newStatus: ORDER_STATUS.CANCELED,
      updatedBy: currentUser._id,
      note: reason,
    });

    await order.save({ session });

    await session.commitTransaction();

    const vendorUserId = vendor?.userId;
    if (notifyVendor && vendorUserId) {
      notificationsToEmit.push(async () => {
        NotificationService.sendToUser(
          vendorUserId,
          'Order Canceled',
          `The customer has canceled order #${order.orderId}: ${reason}`,
          { orderId: order.orderId },
          'default',
          'ORDER',
        );
      });
    }

    if (notifyRider && deliveryPartnerUserId) {
      notificationsToEmit.push(async () => {
        NotificationService.sendToUser(
          deliveryPartnerUserId,
          'Order Canceled',
          `Order #${order.orderId} was canceled by the customer. Please stop the delivery.`,
          { orderId: order.orderId },
          'default',
          'ORDER',
        );
      });
    }

    Promise.allSettled(notificationsToEmit.map((fn) => fn())).catch((err) =>
      console.error('Notification dispatch failed:', err),
    );

    try {
      emitOrderStatusUpdate(getIO(), {
        orderId: order.orderId,
        orderStatus: ORDER_STATUS.CANCELED,
        order: order.toObject(),
        customerUserId: currentUser.userId || null,
        vendorUserId: vendorUserId || null,
        deliveryPartnerUserId: deliveryPartnerUserId || null,
      });
    } catch (socketErr) {
      console.error('Socket emission failed:', socketErr);
    }

    return {
      messageKey: 'ORDER_CANCELED_BY_CUSTOMER_SUCCESS',
      data: order,
      shouldRefund,
    };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

// broadcast order to delivery partners
const broadcastOrderToPartners = async (
  orderId: string,
  currentUser: TCurrentUser,
) => {
  if (!currentUser || currentUser.status !== 'APPROVED') {
    throw new AppError(httpStatus.FORBIDDEN, 'NOT_APPROVED_WITH_STATUS', {
      status: currentUser?.status,
    });
  }

  const loc = currentUser.currentSessionLocation?.coordinates;
  const longitude = loc?.[0];
  const latitude = loc?.[1];
  if (!loc || typeof longitude !== 'number' || typeof latitude !== 'number') {
    throw new AppError(httpStatus.BAD_REQUEST, 'VENDOR_LOCATION_NOT_SET');
  }

  const vendorCoordinates: [number, number] = [longitude, latitude];
  const io = getIO();

  // Fetch target transaction record safely
  const order = await Order.findOne({
    orderId,
    vendorId: currentUser._id.toString(),
    isDeleted: false,
  }).populate(
    'customerId',
    'name userId role contactNumber currentSessionLocation profilePhoto',
  );

  if (!order) {
    throw new AppError(httpStatus.NOT_FOUND, 'ORDER_NOT_FOUND');
  }

  if (order.dispatchPartnerPool && order.dispatchPartnerPool.length > 0) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'ORDER_ALREADY_DISPATCHED_TO_PARTNERS',
      { count: order.dispatchPartnerPool.length },
    );
  }

  const VALID_DISPATCH_STATUSES = [
    'ACCEPTED',
    'AWAITING_PARTNER',
    'REASSIGNMENT_NEEDED',
  ];
  if (!VALID_DISPATCH_STATUSES.includes(order.orderStatus)) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'ORDER_NOT_FOUND_OR_NOT_ACCEPTED',
    );
  }

  let eligiblePartners: TDeliveryPartner[] = [];

  for (const radius of DELIVERY_SEARCH_TIERS_METERS) {
    const partners = await DeliveryPartner.aggregate([
      {
        $geoNear: {
          near: { type: 'Point', coordinates: vendorCoordinates },
          key: 'currentSessionLocation',
          maxDistance: radius,
          spherical: true,
          distanceField: 'distance',
          query: {
            isDeleted: false,
            status: 'APPROVED',
            'operationalData.currentStatus': 'IDLE',
            $expr: {
              $lt: [
                {
                  $size: { $ifNull: ['$operationalData.currentOrderIds', []] },
                },
                '$operationalData.capacity',
              ],
            },
          },
        },
      },
      { $limit: 10 },
    ]);

    if (partners.length > 0) {
      eligiblePartners = partners;
      break;
    }
  }

  if (eligiblePartners.length === 0) {
    updateOrderStatusHistory({
      order,
      newStatus: ORDER_STATUS.AWAITING_PARTNER,
      updatedBy: currentUser._id,
      note: 'No delivery partner found nearby, waiting for partner',
    });

    await order.save();
    throw new AppError(httpStatus.BAD_REQUEST, 'NO_PARTNER_FOUND');
  }

  const partnerObjectIds = eligiblePartners.map((p) => p._id).filter(Boolean);
  const partnerPoolIds = eligiblePartners
    .map((p) => p._id?.toString())
    .filter(Boolean);
  const partnerUserIds = eligiblePartners.map((p) => p.userId).filter(Boolean);

  const timerSeconds = 120;
  const expirationTime = new Date(Date.now() + timerSeconds * 1000);

  await DeliveryPartner.updateMany(
    { _id: { $in: partnerObjectIds } },
    {
      $inc: { 'operationalData.totalOfferedOrders': 1 },
      $set: { 'operationalData.lastActivityAt': new Date() },
    },
  );

  updateOrderStatusHistory({
    order,
    newStatus: ORDER_STATUS.DISPATCHING,
    updatedBy: currentUser._id,
    note: `Broadcasted to ${partnerPoolIds.length} nearby delivery partners`,
  });

  order.dispatchExpiresAt = expirationTime;

  const currentPool = new Set(order.dispatchPartnerPool || []);
  partnerPoolIds.forEach((id) => {
    if (id) currentPool.add(id);
  });
  order.dispatchPartnerPool = Array.from(currentPool);

  await order.save();

  const orderDataForPopup = {
    orderId: order.orderId,
    deliveryAddress: order.deliveryAddress,
    vendorName: currentUser?.businessDetails?.businessName || 'Store',
    timer: timerSeconds,
    expiresAt: expirationTime,
    riderEarning: order.payoutSummary.rider,
  };

  partnerUserIds.forEach((userId) => {
    io.to(`user_${userId}`).emit('NEW_ORDER_AVAILABLE', orderDataForPopup);
  });

  for (const userId of partnerUserIds) {
    const notificationPayload = {
      title: 'New Order Available',
      body: 'A new delivery request is available near your location.',
      data: {
        orderId: order.orderId,
        orderStatus: ORDER_STATUS.DISPATCHING,
        riderEarning: String(order.payoutSummary.rider.riderNetEarnings || '0'),
      },
    };
    NotificationService.sendToUser(
      userId,
      notificationPayload.title,
      notificationPayload.body,
      notificationPayload.data,
      'order_notification',
      'ORDER',
    );
  }

  return {
    messageKey: 'ORDER_DISPATCHED_TO_PARTNERS',
    variables: { count: partnerPoolIds.length },
    data: orderDataForPopup,
  };
};

// partner accepts or rejects dispatched order
const partnerAcceptsDispatchedOrder = async (
  currentUser: TCurrentUser,
  orderId: string,
  payload: { action: 'ACCEPT' | 'REJECT' },
) => {
  if (
    currentUser.status !== 'APPROVED' ||
    currentUser.role !== 'DELIVERY_PARTNER'
  ) {
    throw new AppError(httpStatus.FORBIDDEN, 'PARTNER_NOT_APPROVED');
  }

  if (
    payload.action === 'ACCEPT' &&
    currentUser.operationalData?.currentOrderId
  ) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'PARTNER_ALREADY_HAS_ACTIVE_ORDER',
    );
  }

  const session = await mongoose.startSession();

  let resultData: any = null;
  let notifiedPartnerIds: string[] = [];
  let vendorUserId: string | null = null;
  let isExpiredAction = false;
  let isRejectAction = false;

  const currentPartnerPoolId = currentUser._id.toString();

  try {
    await session.withTransaction(async () => {
      const order = await Order.findOne({ orderId })
        .populate('vendorId')
        .session(session);
      if (!order) throw new AppError(httpStatus.NOT_FOUND, 'ORDER_NOT_FOUND');

      vendorUserId = (order.vendorId as any)?.userId;

      const isExpired =
        order.dispatchExpiresAt &&
        new Date() > new Date(order.dispatchExpiresAt);

      if (isExpired && order.orderStatus === ORDER_STATUS.DISPATCHING) {
        await Order.updateOne(
          { orderId },
          {
            $set: {
              orderStatus: ORDER_STATUS.AWAITING_PARTNER,
              dispatchPartnerPool: [],
            },
            $push: {
              statusHistory: {
                status: ORDER_STATUS.AWAITING_PARTNER,
                timestamp: new Date(),
                note: 'Dispatch window expired, waiting for partner',
              },
            },
          },
          { session },
        );
        isExpiredAction = true;
        return;
      }

      if (payload.action === 'REJECT') {
        const isInPool =
          order.dispatchPartnerPool?.includes(currentPartnerPoolId);
        if (!isInPool)
          throw new AppError(httpStatus.BAD_REQUEST, 'NOT_IN_POOL');

        const isLastPartner = order.dispatchPartnerPool?.length === 1;

        await Order.updateOne(
          { orderId },
          {
            $pull: { dispatchPartnerPool: currentPartnerPoolId },
            ...(isLastPartner && {
              $set: { orderStatus: ORDER_STATUS.AWAITING_PARTNER },
              $push: {
                statusHistory: {
                  status: ORDER_STATUS.AWAITING_PARTNER,
                  timestamp: new Date(),
                  updatedBy: currentUser._id,
                  note: 'Rejected by all offered partners, order is awaiting partner',
                },
              },
            }),
          },
          { session },
        );

        await DeliveryPartner.updateOne(
          { _id: currentUser._id },
          {
            $inc: { 'operationalData.totalRejectedOrders': 1 },
            $set: { 'operationalData.lastActivityAt': new Date() },
          },
          { session },
        );
        isRejectAction = true;
        return;
      }

      notifiedPartnerIds = [...(order.dispatchPartnerPool || [])];

      const partnerFullName =
        `${currentUser.name?.firstName || ''} ${currentUser.name?.lastName || ''}`.trim() ||
        'Delivery Partner';

      const claimedOrder = await Order.findOneAndUpdate(
        {
          orderId,
          orderStatus: ORDER_STATUS.DISPATCHING,
          deliveryPartnerId: null,
          dispatchPartnerPool: { $in: [currentPartnerPoolId] },
          dispatchExpiresAt: { $gt: new Date() },
        },
        {
          $set: {
            deliveryPartnerId: currentUser._id,
            orderStatus: ORDER_STATUS.ASSIGNED,
            dispatchPartnerPool: [],
          },
          $push: {
            statusHistory: {
              status: ORDER_STATUS.ASSIGNED,
              timestamp: new Date(),
              updatedBy: currentUser._id,
              note: `Assigned to delivery partner: ${partnerFullName}`,
            },
          },
        },
        { new: true, session },
      ).populate('customerId', 'name userId contactNumber profilePhoto');

      if (!claimedOrder) {
        throw new AppError(
          httpStatus.CONFLICT,
          'ORDER_ALREADY_CLAIMED_OR_EXPIRED',
        );
      }

      await DeliveryPartner.updateOne(
        { _id: currentUser._id },
        {
          $set: {
            'operationalData.currentOrderId': claimedOrder._id,
            'operationalData.currentStatus': 'ON_DELIVERY',
          },
          $inc: { 'operationalData.totalAcceptedOrders': 1 },
        },
        { session },
      );

      resultData = claimedOrder;
    });

    const io = getIO();

    if (isExpiredAction) {
      io.to(`user_${currentUser.userId}`).emit('REMOVE_ORDER_POPUP', {
        orderId,
      });
      return { data: null, messageKey: 'ORDER_REQUEST_EXPIRED' };
    }

    if (isRejectAction) {
      io.to(`user_${currentUser.userId}`).emit('REMOVE_ORDER_POPUP', {
        orderId,
      });
      return { data: null, messageKey: 'ORDER_REJECTED' };
    }

    notifiedPartnerIds.forEach((partnerPoolId) => {
      io.to(`partner_pool_${partnerPoolId}`).emit('REMOVE_ORDER_POPUP', {
        orderId,
      });
    });

    io.to(`user_${currentUser.userId}`).emit('REMOVE_ORDER_POPUP', { orderId });

    if (vendorUserId) {
      io.to(`user_${vendorUserId}`).emit('ORDER_ACCEPTED_BY_PARTNER', {
        orderId,
        partnerName: `${currentUser.name?.firstName || ''} ${currentUser.name?.lastName || ''}`,
      });

      NotificationService.sendToUser(
        vendorUserId,
        `Order is accepted`,
        `Order is now accepted by delivery partner`,
        { orderId, orderStatus: resultData.orderStatus, type: 'ORDER_STATUS' },
        'default',
        'ORDER',
      );
    }

    return { data: resultData, messageKey: 'ORDER_ACCEPTED' };
  } finally {
    session.endSession();
  }
};

// update order status by delivery partner service
const updateOrderStatusByDeliveryPartner = async (
  orderId: string,
  currentUser: TCurrentUser,
  payload: {
    orderStatus: OrderStatus;
    deliveryProofImage: string | null;
    reason?: string;
  },
) => {
  const { orderStatus, deliveryProofImage, reason } = payload;
  if (!currentUser || currentUser.role !== 'DELIVERY_PARTNER') {
    throw new AppError(httpStatus.FORBIDDEN, 'DELIVERY_PARTNER_NOT_FOUND');
  }

  const validTransitions: Record<string, string> = {
    [ORDER_STATUS.PICKED_UP]: ORDER_STATUS.READY_FOR_PICKUP,
    [ORDER_STATUS.ON_THE_WAY]: ORDER_STATUS.PICKED_UP,
    [ORDER_STATUS.DELIVERED]: ORDER_STATUS.ON_THE_WAY,
    [ORDER_STATUS.REASSIGNMENT_NEEDED]: ORDER_STATUS.ASSIGNED,
  };

  const requiredCurrentStatus = validTransitions[orderStatus];

  if (!requiredCurrentStatus) {
    throw new AppError(httpStatus.FORBIDDEN, 'CANNOT_CHANGE_STATUS_TO', {
      status: orderStatus,
    });
  }

  if (orderStatus === ORDER_STATUS.REASSIGNMENT_NEEDED && !reason) {
    throw new AppError(httpStatus.BAD_REQUEST, 'REASON_REQUIRED');
  }

  if (orderStatus === ORDER_STATUS.DELIVERED && !deliveryProofImage) {
    throw new AppError(httpStatus.BAD_REQUEST, 'DELIVERY_PROOF_IMAGE_REQUIRED');
  }

  const updatedOrder = await Order.findOneAndUpdate(
    {
      orderId,
      deliveryPartnerId: currentUser._id.toString(),
      orderStatus: requiredCurrentStatus,
      isDeleted: false,
    },
    {
      $set: {
        orderStatus: orderStatus,
        ...(orderStatus === ORDER_STATUS.DELIVERED &&
          deliveryProofImage && {
            'delivery.deliveryProofImage': deliveryProofImage,
          }),
        ...(orderStatus === ORDER_STATUS.REASSIGNMENT_NEEDED && {
          deliveryPartnerId: null,
          deliveryPartnerCancelReason: reason,
        }),
      },
      $push: {
        statusHistory: {
          status: orderStatus,
          timestamp: new Date(),
          updatedBy: currentUser._id,
          note:
            orderStatus === ORDER_STATUS.REASSIGNMENT_NEEDED
              ? reason
              : undefined,
        },
      },
    },
    { new: true },
  ).populate(
    'customerId vendorId',
    'name userId role contactNumber currentSessionLocation profilePhoto',
  );

  if (!updatedOrder) {
    const orderCheck = await Order.findOne({
      orderId,
      isDeleted: false,
    }).select('orderStatus');

    if (!orderCheck) {
      throw new AppError(httpStatus.NOT_FOUND, 'ORDER_NOT_FOUND');
    }

    if (orderCheck?.orderStatus === payload.orderStatus) {
      throw new AppError(httpStatus.BAD_REQUEST, 'ORDER_STATUS_ALREADY', {
        status: payload.orderStatus,
      });
    }
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'ORDER_MUST_BE_IN_TO_TRANSITION',
      {
        requiredStatus: requiredCurrentStatus,
        targetStatus: payload.orderStatus,
      },
    );
  }

  if (payload.orderStatus === ORDER_STATUS.DELIVERED) {
    const partner = await DeliveryPartner.findById(
      updatedOrder?.deliveryPartnerId,
    );
    if (!partner) {
      throw new AppError(
        httpStatus.NOT_FOUND,
        'DELIVERY_PARTNER_NOT_FOUND_FOR_ORDER',
      );
    }
  }

  await orderQueue.add('PROCESS_ORDER_POST_UPDATE', {
    orderDbId: updatedOrder._id,
    orderStatus: orderStatus,
    partnerUserId: currentUser.userId,
    orderDisplayId: orderId,
  });

  emitOrderStatusUpdate(getIO(), {
    orderId: updatedOrder.orderId,
    orderStatus: orderStatus,
    order: updatedOrder.toObject(),
    customerUserId: (updatedOrder.customerId as any)?.userId || null,
    vendorUserId: (updatedOrder.vendorId as any)?.userId || null,
    deliveryPartnerUserId: currentUser.userId || null,
  });

  return {
    messageKey: 'ORDER_STATUS_UPDATED_SUCCESS',
    data: updatedOrder,
  };
};

// get all order service
const getAllOrders = async (
  incomingQuery: Record<string, unknown>,
  currentUser: TCurrentUser,
) => {
  if (currentUser.status !== 'APPROVED') {
    throw new AppError(httpStatus.FORBIDDEN, 'NOT_APPROVED_TO_VIEW_ORDERS', {
      status: currentUser.status,
    });
  }

  // --------------------------------------------------------
  // Create a SAFE query object & Force clean initial variables
  // --------------------------------------------------------
  const query: Record<string, unknown> = { ...incomingQuery };

  // Set default sorting if not explicitly provided in the query string
  if (!query.sortBy) {
    query.sortBy = '-createdAt';
  }

  const userObjectId = new Types.ObjectId(currentUser._id as unknown as string);

  // --------------------------------------------------------
  // Enforce Absolute Role-Based Isolation Filters
  // --------------------------------------------------------
  switch (currentUser.role) {
    case 'VENDOR':
    case 'SUB_VENDOR':
      query.vendorId = userObjectId;
      break;

    case 'CUSTOMER':
      query.customerId = userObjectId;
      break;

    case 'DELIVERY_PARTNER':
      query.deliveryPartnerId = userObjectId;
      break;

    case 'FLEET_MANAGER': {
      const managedPartners = await DeliveryPartner.find({
        'registeredBy.id': userObjectId,
      })
        .select('_id')
        .lean();

      const partnerIds = managedPartners.map((partner) =>
        partner._id.toString(),
      );
      query.deliveryPartnerId = {
        $in: partnerIds.length > 0 ? partnerIds : [],
      };
      break;
    }

    case 'ADMIN':
    case 'SUPER_ADMIN':
      break;

    default:
      throw new AppError(httpStatus.FORBIDDEN, 'INVALID_USER_ROLE');
  }

  // --------------------------------------------------------
  // Build Query Pipeline with QueryBuilder
  // --------------------------------------------------------
  const builder = new QueryBuilder(Order.find(), query)
    .search(OrderSearchableFields)
    .filter()
    .sort()
    .paginate()
    .fields();

  // Populate structural settings configuration
  const populateOptions = getPopulateOptions(currentUser?.role, {
    customer:
      'name userId role contactNumber currentSessionLocation profilePhoto NIF',
    vendor:
      'name userId role businessDetails.businessName businessDetails.businessType',
    deliveryPartner:
      'name userId role contactNumber currentSessionLocation profilePhoto',
    businessType: 'name',
  });

  populateOptions.forEach((option) => {
    builder.modelQuery = builder.modelQuery.populate(option);
  });

  // 1. Generate Metadata counts smoothly
  const meta = await builder.countTotal();

  const data = await builder.modelQuery.lean();

  return {
    messageKey: 'ORDERS_RETRIEVED_SUCCESS',
    meta,
    data,
  };
};

// get single order for customer service
const getSingleOrder = async (orderId: string, currentUser: TCurrentUser) => {
  if (currentUser.status !== 'APPROVED') {
    throw new AppError(httpStatus.FORBIDDEN, 'NOT_APPROVED_TO_VIEW_ORDER', {
      status: currentUser.status,
    });
  }

  const userObjectId = currentUser._id;
  // ------------------------------------------------------
  // Build role-based query filter securely
  // ------------------------------------------------------
  const filter: Record<string, any> = {};

  switch (currentUser.role) {
    case 'CUSTOMER':
      filter.customerId = userObjectId.toString();
      break;

    case 'VENDOR':
    case 'SUB_VENDOR':
      filter.vendorId = userObjectId.toString();
      break;

    case 'DELIVERY_PARTNER':
      filter.deliveryPartnerId = userObjectId.toString();
      break;

    case 'FLEET_MANAGER': {
      const managedPartners = await DeliveryPartner.find({
        'registeredBy.id': userObjectId,
      })
        .select('_id')
        .lean();

      const partnerIds = managedPartners.map((partner) =>
        partner._id.toString(),
      );
      filter.deliveryPartnerId = {
        $in: partnerIds.length > 0 ? partnerIds : [],
      };
      break;
    }

    case 'ADMIN':
    case 'SUPER_ADMIN':
      break;

    default:
      throw new AppError(
        httpStatus.FORBIDDEN,
        'INVALID_ROLE_OR_PERMISSION_DENIED',
      );
  }

  // ------------------------------------------------------
  // Fetch order using secure filter configuration
  // ------------------------------------------------------
  const query = Order.findOne({
    orderId: orderId,
    isDeleted: false,
    ...filter,
  });

  const populateOptions = getPopulateOptions(currentUser?.role, {
    customer:
      'name userId role contactNumber currentSessionLocation profilePhoto NIF',
    vendor:
      'name userId role businessDetails.businessName businessDetails.businessType',
    deliveryPartner:
      'name userId role contactNumber currentSessionLocation profilePhoto',
    businessType: 'name',
    // product: 'productId name',
  });

  populateOptions.forEach((option) => {
    query.populate(option);
  });

  const order = await query.lean();

  if (!order) {
    throw new AppError(httpStatus.NOT_FOUND, 'ORDER_NOT_FOUND');
  }

  return {
    messageKey: 'ORDER_RETRIEVED_SUCCESS',
    data: order,
  };
};

// get delivery partners dispatch order service
const getDeliveryPartnersDispatchOrder = async (currentUser: TCurrentUser) => {
  // Enforce role barrier safety
  if (!currentUser || currentUser.role !== 'DELIVERY_PARTNER') {
    throw new AppError(httpStatus.FORBIDDEN, 'DELIVERY_PARTNER_NOT_FOUND');
  }

  if (currentUser.status !== 'APPROVED') {
    throw new AppError(httpStatus.FORBIDDEN, 'PARTNER_NOT_APPROVED');
  }

  const currentPartnerPoolId = currentUser._id.toString();
  const now = new Date();

  // ----------------------------------------------------------------------
  // Secure Query Pipeline: Fetch active, unexpired, valid dispatches only
  // ----------------------------------------------------------------------
  const orders = await Order.find({
    dispatchPartnerPool: { $in: [currentPartnerPoolId] },
    orderStatus: ORDER_STATUS.DISPATCHING,
    dispatchExpiresAt: { $gt: now },
    isDeleted: false,
  })
    .sort({ createdAt: -1 })
    .lean();

  if (!orders || orders.length === 0) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      'NO_DISPATCH_ORDERS_FOUND_FOR_PARTNER',
    );
  }

  return {
    messageKey: 'DELIVERY_PARTNER_DISPATCH_ORDER_FETCHED_SUCCESS',
    data: orders,
  };
};

// get delivery partner current order service
const getDeliveryPartnerCurrentOrder = async (currentUser: TCurrentUser) => {
  // Enforce absolute role barrier safety
  if (currentUser.role !== 'DELIVERY_PARTNER') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'ONLY_DELIVERY_PARTNERS_CAN_ACCESS_CURRENT_ORDER',
    );
  }

  if (currentUser.status !== 'APPROVED') {
    throw new AppError(httpStatus.FORBIDDEN, 'PARTNER_NOT_APPROVED');
  }

  const currentOrderId = currentUser.operationalData?.currentOrderId;

  if (!currentOrderId) {
    throw new AppError(httpStatus.NOT_FOUND, 'NO_ORDER_FOUND_FOR_PARTNER');
  }

  // ----------------------------------------------------------------------
  // Fetch active assigned order with enhanced navigation fields
  // ----------------------------------------------------------------------
  const order = await Order.findOne({
    _id: currentOrderId,
    deliveryPartnerId: currentUser._id,
    orderStatus: { $nin: ['DELIVERED', 'CANCELED', 'REJECTED'] },
    isDeleted: false,
  })
    .populate('customerId', 'name userId role contactNumber profilePhoto NIF')
    .populate(
      'vendorId',
      'name userId role contactNumber businessDetails businessLocation currentSessionLocation',
    )
    .lean();

  if (!order) {
    throw new AppError(httpStatus.NOT_FOUND, 'NO_ORDER_FOUND_FOR_PARTNER');
  }

  return {
    messageKey: 'DELIVERY_PARTNER_CURRENT_ORDER_FETCHED_SUCCESS',
    data: order,
  };
};

const reorderOrder = async (
  orderId: string,
  currentUser: TCurrentUser,
  lang: TLanguageCode = 'en',
) => {
  if (currentUser.role !== 'CUSTOMER') {
    throw new AppError(httpStatus.FORBIDDEN, 'CUSTOMER_ONLY_ACTION');
  }

  const order = await Order.findOne({
    orderId,
    customerId: currentUser._id,
    isDeleted: false,
  }).lean();

  if (!order) {
    throw new AppError(httpStatus.NOT_FOUND, 'ORDER_NOT_FOUND');
  }

  let cartResult: any = null;

  for (const item of order.items || []) {
    cartResult = await CartServices.addToCart(
      {
        items: [
          {
            productId: item.productId.toString(),
            quantity: item.itemSummary.quantity,
            variationSku: item.variationSku || undefined,
            addons: (item.addons || []).map((addon) => ({
              optionSku: addon.sku,
              quantity: addon.quantity,
            })),
          },
        ],
      },
      currentUser,
      lang,
    );
  }

  return {
    messageKey: 'ORDER_REORDER_SUCCESS',
    data: cartResult?.data || null,
  };
};

export const OrderServices = {
  createOrderAfterRedUniqPayment,
  finalizeCheckoutIntoOrder,
  updateOrderStatusByVendor,
  cancelOrderByCustomer,
  broadcastOrderToPartners,
  partnerAcceptsDispatchedOrder,
  updateOrderStatusByDeliveryPartner,
  getAllOrders,
  getSingleOrder,
  getDeliveryPartnersDispatchOrder,
  getDeliveryPartnerCurrentOrder,
  reorderOrder,
};
