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
} from './order.constant';
import { DeliveryPartner } from '../Delivery-Partner/delivery-partner.model';
import { CheckoutSummary } from '../Checkout/checkout.model';
import { Product } from '../Product/product.model';
import mongoose from 'mongoose';
import { TDeliveryPartner } from '../Delivery-Partner/delivery-partner.interface';
import { NotificationService } from '../Notification/notification.service';
import { Customer } from '../Customer/customer.model';
import { getPopulateOptions } from '../../utils/getPopulateOptions';
import { Vendor } from '../Vendor/vendor.model';
import { getIO } from '../../lib/Socket';
import axios from 'axios';
import config from '../../config';
import { Transaction } from '../Transaction/transaction.model';
import customNanoId from '../../utils/customNanoId';
import { orderQueue } from '../../BullMQ/Queue/order.queue';
import { TMessageKey } from '../../errors/messages';
import { TLanguageCode } from '../../constant/GlobalInterface/language.interface';

// Create Order after redUniq payment
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

  if (!process.env.REDUNIQ_API_URL) {
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'REDUNIQ_API_URL_NOT_CONFIGURED',
    );
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

  if (summary.customerId.toString() !== currentUser._id.toString()) {
    throw new AppError(httpStatus.UNAUTHORIZED, 'NOT_AUTHORIZED_TO_VIEW');
  }
  if (summary.isConvertedToOrder) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'CHECKOUT_SUMMARY_ALREADY_CONVERTED',
    );
  }

  const existingVendor = await Vendor.findById(summary.vendorId);
  if (!existingVendor) {
    throw new AppError(httpStatus.NOT_FOUND, 'VENDOR_NOT_FOUND');
  }

  if (
    !paymentData ||
    !paymentData.transaction ||
    paymentData.transaction.status !== '4'
  ) {
    throw new AppError(httpStatus.BAD_REQUEST, 'PAYMENT_FAILED_TRY_AGAIN');
  }

  const transactionId = paymentData.transaction.id;

  // --- Transaction ---
  const session = await mongoose.startSession();
  session.startTransaction();
  const uniqueOrderId = customNanoId(10);

  try {
    const orderData = {
      ...summary.toObject(),
      _id: undefined,
      delivery: {
        ...summary.delivery,
        notes: deliveryNotes || '',
      },
      orderId: `ORD-${uniqueOrderId}`,
      paymentMethod: summary.paymentMethod,
      paymentStatus: 'PAID',
      isPaid: true,
      transactionId: transactionId,
      orderStatus: 'PENDING',
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
          paymentMethod: summary.paymentMethod,
          remarks: `Order payment successful for Order ID: ${order.orderId}`,
        },
      ],
      { session },
    );

    summary.isConvertedToOrder = true;
    summary.paymentStatus = 'PAID';
    summary.transactionId = transactionId;
    summary.orderId = new mongoose.Types.ObjectId(order._id);

    await summary.save({ session });

    await session.commitTransaction();

    await orderQueue.add('NEW_ORDER_POST_PROCESS', {
      orderId: order._id.toString(),
      vendorId: existingVendor._id.toString(),
      vendorUserId: existingVendor.userId,
      orderDisplayId: order.orderId,
      grandTotal: order.payoutSummary.grandTotal,
      lang: lang,
      customerId: summary.customerId.toString(),
      orderedItems: summary.items.map((i: any) => ({
        productId: i.productId.toString(),
        variationSku: i.variationSku || null,
      })),
    });

    return {
      messageKey: 'ORDER_CREATED_SUCCESS' as TMessageKey,
      data: order,
    };
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
};

// update order status by vendor (accept / reject / preparing / cancel)
const updateOrderStatusByVendor = async (
  currentUser: TCurrentUser,
  orderId: string,
  action: { type: OrderStatus; reason?: string },
) => {
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

  // --------------------------------------------------------
  // Allowed vendor actions
  // --------------------------------------------------------
  const ALLOWED_VENDOR_ACTIONS: (keyof typeof ORDER_STATUS)[] = [
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

  try {
    // ---------------------------------------------------------
    // Find the order for this vendor
    // ---------------------------------------------------------

    const order = await Order.findOne(
      {
        orderId,
        vendorId: currentUser._id,
        isDeleted: false,
      },
      null,
      { session },
    ).populate('vendorId', '_id businessDetails');

    if (!order) {
      throw new AppError(httpStatus.NOT_FOUND, 'ORDER_NOT_FOUND_WITH_DOT');
    }

    const vendor = order.vendorId as any;

    const isRestaurant =
      vendor?.businessDetails?.businessType?.toUpperCase() === 'RESTAURANT';

    const shouldCheckStock = !isRestaurant;
    // ---------------------------------------------------------
    // Only paid orders can be processed
    // ---------------------------------------------------------
    if (!order.isPaid) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'ONLY_PAID_ORDER_CAN_ACCEPT_REJECT',
      );
    }

    // ---------------------------------------------------------
    // Prevent duplicate status
    // ---------------------------------------------------------
    if (action.type === order.orderStatus) {
      throw new AppError(httpStatus.BAD_REQUEST, 'ORDER_ALREADY_IN_STATUS', {
        status: action.type,
      });
    }

    // ---------------------------------------------------------
    // Find related users
    // ---------------------------------------------------------
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

    // ---------------------------------------------------------
    // Only pending orders are allowed to be accepted/rejected
    // ---------------------------------------------------------
    if (action.type === 'ACCEPTED' && order.orderStatus !== 'PENDING') {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'ORDER_MUST_BE_PENDING_TO_ACCEPT',
        { currentStatus: order.orderStatus },
      );
    }

    // ---------------------------------------------------------
    // Only accepted orders are allowed to be prepared
    // ---------------------------------------------------------
    if (
      action.type === ORDER_STATUS.PREPARING &&
      order.orderStatus !== ORDER_STATUS.ASSIGNED
    ) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'ORDER_MUST_BE_ASSIGNED_BEFORE_PREPARING',
      );
    }

    // ---------------------------------------------------------
    // Only prepared orders are allowed to be ready for pickup
    // ---------------------------------------------------------
    if (
      action.type === ORDER_STATUS.READY_FOR_PICKUP &&
      order.orderStatus !== ORDER_STATUS.PREPARING
    ) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'ORDER_MUST_BE_PREPARING_BEFORE_READY_FOR_PICKUP',
      );
    }

    // ---------------------------------------------------------
    // Prevent vendor from accepting/rejecting an order that is already assigned, picked up, on the way, or delivered
    // ---------------------------------------------------------
    if (
      (action.type === 'REJECTED' || action.type === 'CANCELED') &&
      BLOCKED_FOR_ORDER_CANCEL.some((status) => order.orderStatus === status)
    ) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'ORDER_CANNOT_BE_CANCELED_OR_REJECTED_AT_STAGE',
      );
    }

    if (currentUser._id.toString() !== vendor._id.toString()) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        'NOT_AUTHORIZED_ACCEPT_REJECT_ORDERS',
      );
    }

    // ---------------------------------------------------------
    // If ACCEPTED → set pickup address from vendor location and reduce product stock
    // ---------------------------------------------------------
    if (action.type === 'ACCEPTED') {
      if (!order.pickupAddress) {
        order.pickupAddress = {
          street: currentUser?.businessLocation?.street || '',
          city: currentUser?.businessLocation?.city || '',
          state: currentUser?.businessLocation?.state || '',
          country: currentUser?.businessLocation?.country || '',
          postalCode: currentUser?.businessLocation?.postalCode || '',
          longitude: currentUser?.businessLocation?.longitude || 0,
          latitude: currentUser?.businessLocation?.latitude || 0,
          geoAccuracy: currentUser?.businessLocation?.geoAccuracy,
          detailedAddress: currentUser?.businessLocation?.detailedAddress || '',
        };
      }

      // --------------------------------------------------------
      // Reduce product stock
      // --------------------------------------------------------
      if (shouldCheckStock) {
        const stockOperations = order.items.map((item) => ({
          updateOne: {
            filter: {
              _id: new mongoose.Types.ObjectId(item.productId),
              'stock.quantity': { $gte: item.itemSummary.quantity },
            },
            update: {
              $inc: { 'stock.quantity': -item.itemSummary.quantity },
            },
          },
        }));
        const stockResult = await Product.bulkWrite(stockOperations, {
          session,
        });
        if (stockResult.modifiedCount !== order.items.length) {
          throw new AppError(httpStatus.BAD_REQUEST, 'STOCK_CHECK_FAILED');
        }
      }

      const notificationPayload = {
        title: 'Order Accepted',
        body: `Your order has been accepted by ${currentUser.businessDetails?.businessName}.Please wait for your order to be picked up.`,
        data: { orderId: order.orderId },
      };
      NotificationService.sendToUser(
        customerId!,
        notificationPayload.title,
        notificationPayload.body,
        notificationPayload.data,
        'default',
        'ORDER',
      );
    }
    // ---------------------------------------------------------
    // PREPARING logic
    // ---------------------------------------------------------
    if (action.type === ORDER_STATUS.PREPARING) {
      NotificationService.sendToUser(
        customerId!,
        'Order is being prepared',
        `Your order is now being prepared by ${currentUser.businessDetails?.businessName}.`,
        { orderId: order.orderId.toString(), status: ORDER_STATUS.PREPARING },
        'default',
        'ORDER',
      );
    }

    // ---------------------------------------------------------
    // Ready for pickup logic
    // ---------------------------------------------------------
    if (action.type === ORDER_STATUS.READY_FOR_PICKUP) {
      NotificationService.sendToUser(
        customerId!,
        'Order is ready for pickup',
        `Your order is now ready for pickup by ${currentUser.businessDetails?.businessName}.`,
        {
          orderId: order.orderId,
          status: ORDER_STATUS.READY_FOR_PICKUP,
        },
        'default',
        'ORDER',
      );
    }

    // ---------------------------------------------------------
    // If Canceled → add cancel reason and add product to stock
    // ---------------------------------------------------------
    if (action.type === 'CANCELED') {
      if (!action.reason) {
        throw new AppError(httpStatus.BAD_REQUEST, 'CANCEL_REASON_REQUIRED');
      }
      order.cancelReason = action.reason;
      // --------------------------------------------------------
      // Add product to stock
      // --------------------------------------------------------
      if (shouldCheckStock) {
        const stockOperations = order.items.map((item) => ({
          updateOne: {
            filter: { _id: new mongoose.Types.ObjectId(item.productId) },
            update: {
              $inc: { 'stock.quantity': item.itemSummary.quantity },
            },
          },
        }));
        await Product.bulkWrite(stockOperations, { session });
      }
      const notificationPayload = {
        title: 'Order Canceled',
        body: `Your order has been canceled for ${action.reason}`,
        data: { orderId: order.orderId },
      };
      if (order.deliveryPartnerId) {
        NotificationService.sendToUser(
          deliveryPartnerId!,
          notificationPayload.title,
          notificationPayload.body,
          notificationPayload.data,
          'default',
          'ORDER',
        );
      }
      NotificationService.sendToUser(
        customerId!,
        notificationPayload.title,
        notificationPayload.body,
        notificationPayload.data,
        'default',
        'ORDER',
      );
    }

    // ---------------------------------------------------------
    // If REJECTED → add reject reason
    // ---------------------------------------------------------
    if (action.type === 'REJECTED') {
      if (!action.reason) {
        throw new AppError(httpStatus.BAD_REQUEST, 'REJECT_REASON_REQUIRED');
      }
      order.rejectReason = action.reason;

      const notificationPayload = {
        title: 'Order Rejected',
        body: `Your order has been rejected for ${action.reason}`,
        data: { orderId: order.orderId },
      };
      NotificationService.sendToUser(
        customerId!,
        notificationPayload.title,
        notificationPayload.body,
        notificationPayload.data,
        'default',
        'ORDER',
      );
    }

    // ---------------------------------------------------------
    // Update order status & save
    // ---------------------------------------------------------
    order.orderStatus = action.type;
    await order.save({ session });

    // ---------------------------------------------------------
    // TODO: send notification to customer about status change
    // ---------------------------------------------------------

    await session.commitTransaction();
    session.endSession();
    return {
      messageKey: 'ORDER_STATUS_UPDATED_SUCCESS_DYNAMIC' as TMessageKey,
      variables: { status: action.type },
      data: order,
    };
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
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

  // Vendor location check
  const loc = currentUser.currentSessionLocation?.coordinates;
  const longitude = loc?.[0];
  const latitude = loc?.[1];
  if (!loc || typeof longitude !== 'number' || typeof latitude !== 'number') {
    throw new AppError(httpStatus.BAD_REQUEST, 'VENDOR_LOCATION_NOT_SET');
  }

  const vendorCoordinates: [number, number] = [longitude, latitude];
  const io = getIO();
  // Fetch order AND ensure this vendor owns it
  const order = await Order.findOne({
    orderId,
    vendorId: currentUser._id.toString(),
    isDeleted: false,
  }).populate(
    'customerId',
    'name userId role contactNumber currentSessionLocation profilePhoto',
  );

  if (order?.dispatchPartnerPool && order.dispatchPartnerPool.length > 0) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'ORDER_ALREADY_DISPATCHED_TO_PARTNERS',
      { count: order.dispatchPartnerPool.length },
    );
  }

  if (
    !order ||
    !['ACCEPTED', 'AWAITING_PARTNER', 'REASSIGNMENT_NEEDED'].includes(
      order.orderStatus,
    )
  ) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'ORDER_NOT_FOUND_OR_NOT_ACCEPTED',
    );
  }

  // Cascading search - FIRST non-empty radius only
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

  // If no partners → restore status safely
  if (eligiblePartners.length === 0) {
    await Order.updateOne(
      { orderId },
      { $set: { orderStatus: ORDER_STATUS.AWAITING_PARTNER } },
    );
    throw new AppError(httpStatus.BAD_REQUEST, 'NO_PARTNER_FOUND');
  }

  const partnerObjectIds = eligiblePartners.map((p) => p._id);
  const partnerIds = eligiblePartners.map((p) => p.userId);

  const timerSeconds = 120;
  const expirationTime = new Date(Date.now() + timerSeconds * 1000);

  await DeliveryPartner.updateMany(
    { _id: { $in: partnerObjectIds } },
    {
      $inc: { 'operationalData.totalOfferedOrders': 1 },
      $set: { 'operationalData.lastActivityAt': new Date() },
    },
  );

  // Safe atomic update using $addToSet and status update
  await Order.updateOne(
    { orderId, vendorId: currentUser._id.toString(), isDeleted: false },
    {
      $set: {
        orderStatus: ORDER_STATUS.DISPATCHING,
        dispatchExpiresAt: expirationTime,
      },
      $addToSet: { dispatchPartnerPool: { $each: partnerIds } },
    },
  );

  // show popup to delivery partner
  const orderDataForPopup = {
    orderId: order.orderId,
    deliveryAddress: order.deliveryAddress,
    vendorName: currentUser?.businessDetails?.businessName,
    timer: timerSeconds,
    expiresAt: expirationTime,
    riderEarning: order.payoutSummary.rider,
  };

  partnerIds.forEach((id) => {
    io.to(`user_${id}`).emit('NEW_ORDER_AVAILABLE', orderDataForPopup);
  });

  for (const partnerId of partnerIds) {
    const notificationPayload = {
      title: 'New Order Available',
      body: 'A new order is available for you.',
      data: {
        orderId: order.orderId,
        orderStatus: ORDER_STATUS.DISPATCHING,
        riderEarning: String(
          order.payoutSummary.rider.earningsWithoutTax || '0',
        ),
      },
    };
    NotificationService.sendToUser(
      partnerId,
      notificationPayload.title,
      notificationPayload.body,
      notificationPayload.data,
      'order_notification',
      'ORDER',
    );
  }

  return {
    messageKey: 'ORDER_DISPATCHED_TO_PARTNERS' as TMessageKey,
    variables: { count: partnerIds.length },
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

  try {
    await session.withTransaction(async () => {
      const order = await Order.findOne({ orderId }).session(session);
      if (!order)
        throw new AppError(httpStatus.NOT_FOUND, 'ORDER_NOT_FOUND_WITH_DOT');

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
          },
          { session },
        );
        isExpiredAction = true;
        return;
      }

      if (payload.action === 'REJECT') {
        const isInPool = order.dispatchPartnerPool?.includes(
          currentUser.userId,
        );
        if (!isInPool)
          throw new AppError(httpStatus.BAD_REQUEST, 'NOT_IN_POOL');

        const isLastPartner = order.dispatchPartnerPool?.length === 1;
        await Order.updateOne(
          { orderId },
          {
            $pull: { dispatchPartnerPool: currentUser.userId },
            ...(isLastPartner && {
              $set: { orderStatus: ORDER_STATUS.AWAITING_PARTNER },
            }),
          },
          { session },
        );

        await DeliveryPartner.updateOne(
          { userId: currentUser.userId },
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

      const claimedOrder = await Order.findOneAndUpdate(
        {
          orderId,
          orderStatus: ORDER_STATUS.DISPATCHING,
          deliveryPartnerId: null,
          dispatchPartnerPool: { $in: [currentUser.userId] },
          dispatchExpiresAt: { $gt: new Date() },
        },
        {
          $set: {
            deliveryPartnerId: currentUser._id,
            orderStatus: ORDER_STATUS.ASSIGNED,
            dispatchPartnerPool: [],
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
      return { data: null, messageKey: 'ORDER_REQUEST_EXPIRED' as TMessageKey };
    }

    if (isRejectAction) {
      io.to(`user_${currentUser.userId}`).emit('REMOVE_ORDER_POPUP', {
        orderId,
      });
      return { data: null, messageKey: 'ORDER_REJECTED' as TMessageKey };
    }

    notifiedPartnerIds.forEach((id) => {
      io.to(`user_${id}`).emit('REMOVE_ORDER_POPUP', { orderId });
    });

    if (vendorUserId) {
      io.to(`user_${vendorUserId}`).emit('ORDER_ACCEPTED_BY_PARTNER', {
        orderId,
        partnerName: `${currentUser.name.firstName} ${currentUser.name.lastName}`,
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

    return { data: resultData, messageKey: 'ORDER_ACCEPTED' as TMessageKey };
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

  // VALID state transitions
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

  // REASSIGNMENT needs a reason
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
        ...(orderStatus === ORDER_STATUS.DELIVERED && {
          deliveredAt: new Date(),
          ...(deliveryProofImage && {
            'delivery.deliveryProofImage': deliveryProofImage,
          }),
        }),
        ...(orderStatus === ORDER_STATUS.REASSIGNMENT_NEEDED && {
          deliveryPartnerId: null,
          deliveryPartnerCancelReason: reason,
        }),
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
      throw new AppError(httpStatus.NOT_FOUND, 'ORDER_NOT_FOUND_WITH_DOT');
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

  // Update partner record
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

  return {
    messageKey: 'ORDER_STATUS_UPDATED_SUCCESS' as TMessageKey,
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

  // -----------------------------
  // Create a SAFE query object
  // -----------------------------
  const query: Record<string, unknown> = { ...incomingQuery };

  // -----------------------------
  // Role-Based Query Filters
  // -----------------------------
  switch (currentUser.role) {
    case 'VENDOR':
    case 'SUB_VENDOR':
      query.vendorId = currentUser._id;
      break;

    case 'CUSTOMER':
      query.customerId = currentUser._id;
      break;

    case 'DELIVERY_PARTNER':
      query.deliveryPartnerId = currentUser._id;
      break;

    case 'FLEET_MANAGER': {
      const managedPartners = await DeliveryPartner.find({
        'registeredBy.id': currentUser._id,
      }).select('_id');
      const partnerIds = managedPartners.map((partner) => partner._id);
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

  // -----------------------------
  // Build Query with QueryBuilder
  // -----------------------------
  const builder = new QueryBuilder(Order.find(), query)
    .search(OrderSearchableFields)
    .filter()
    .sort()
    .paginate()
    .fields();

  const populateOptions = getPopulateOptions(currentUser?.role, {
    customer:
      'name userId role contactNumber currentSessionLocation profilePhoto NIF',
    vendor: 'name userId role',
    deliveryPartner:
      'name userId role contactNumber currentSessionLocation profilePhoto',
  });

  populateOptions.forEach((option) => {
    builder.modelQuery = builder.modelQuery.populate(option);
  });

  const meta = await builder.countTotal();
  const data = await builder.modelQuery;

  return {
    messageKey: 'ORDERS_RETRIEVED_SUCCESS' as TMessageKey,
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

  const userId = currentUser._id;
  // ------------------------------------------------------
  // Build role-based query filter securely
  // ------------------------------------------------------
  const filter: Record<string, unknown> = {};

  switch (currentUser.role) {
    case 'CUSTOMER':
      filter.customerId = userId;
      break;

    case 'VENDOR':
      filter.vendorId = userId;
      break;

    case 'DELIVERY_PARTNER':
      filter.deliveryPartnerId = userId;
      // filter.orderStatus = { $in: ['ACCEPTED', 'PICKED', 'DELIVERED'] };
      break;

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
  // Fetch order using secure filter
  // ------------------------------------------------------
  const query = Order.findOne({ orderId: orderId, ...filter });

  const populateOptions = getPopulateOptions(currentUser?.role, {
    customer:
      'name userId role contactNumber currentSessionLocation profilePhoto NIF',
    vendor: 'name userId role',
    deliveryPartner:
      'name userId role contactNumber currentSessionLocation profilePhoto',
    product: 'productId name',
  });

  populateOptions.forEach((option) => {
    query.populate(option);
  });

  const order = await query;

  if (!order) {
    throw new AppError(httpStatus.NOT_FOUND, 'ORDER_NOT_FOUND');
  }

  return {
    messageKey: 'ORDER_RETRIEVED_SUCCESS' as TMessageKey,
    data: order,
  };
};

// get delivery partners dispatch order service
const getDeliveryPartnersDispatchOrder = async (currentUser: TCurrentUser) => {
  const orders = await Order.find({
    dispatchPartnerPool: { $in: [currentUser.userId] },
    isDeleted: false,
  }).sort({ createdAt: -1 });

  if (!orders || orders.length === 0) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      'NO_DISPATCH_ORDERS_FOUND_FOR_PARTNER',
    );
  }
  return {
    messageKey:
      'DELIVERY_PARTNER_DISPATCH_ORDER_FETCHED_SUCCESS' as TMessageKey,
    data: orders,
  };
};

// get delivery partner current order service
const getDeliveryPartnerCurrentOrder = async (currentUser: TCurrentUser) => {
  if (currentUser.role !== 'DELIVERY_PARTNER') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'ONLY_DELIVERY_PARTNERS_CAN_ACCESS_CURRENT_ORDER',
    );
  }
  if (currentUser.operationalData?.currentOrderId === null) {
    throw new AppError(httpStatus.NOT_FOUND, 'NO_ORDER_FOUND_FOR_PARTNER');
  }
  const order = await Order.findOne({
    _id: currentUser.operationalData?.currentOrderId,
    deliveryPartnerId: currentUser._id,
    isDeleted: false,
  })
    .populate(
      'customerId vendorId',
      'name userId role contactNumber currentSessionLocation profilePhoto',
    )
    .sort({ createdAt: -1 });

  if (!order) {
    throw new AppError(httpStatus.NOT_FOUND, 'NO_ORDER_FOUND_FOR_PARTNER');
  }
  return {
    messageKey: 'DELIVERY_PARTNER_CURRENT_ORDER_FETCHED_SUCCESS' as TMessageKey,
    data: order,
  };
};

export const OrderServices = {
  createOrderAfterRedUniqPayment,
  updateOrderStatusByVendor,
  broadcastOrderToPartners,
  partnerAcceptsDispatchedOrder,
  updateOrderStatusByDeliveryPartner,
  getAllOrders,
  getSingleOrder,
  getDeliveryPartnersDispatchOrder,
  getDeliveryPartnerCurrentOrder,
};
