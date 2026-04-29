/* eslint-disable @typescript-eslint/no-explicit-any */
import httpStatus from 'http-status';
import { AuthUser } from '../../constant/user.constant';
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
import { Cart } from '../Cart/cart.model';
import { Product } from '../Product/product.model';
import mongoose from 'mongoose';
import { TDeliveryPartner } from '../Delivery-Partner/delivery-partner.interface';
import { NotificationService } from '../Notification/notification.service';
import { Customer } from '../Customer/customer.model';
import { getPopulateOptions } from '../../utils/getPopulateOptions';
import { Vendor } from '../Vendor/vendor.model';
import { getIO } from '../../lib/Socket';
import { OrderPdService } from '../PdInvoice/orderPd.service';
import axios from 'axios';
import config from '../../config';
import { Transaction } from '../Transaction/transaction.model';
import { Wallet } from '../Wallet/wallet.model';
import { roundTo2 } from '../../utils/mathProvider';
import { Admin } from '../Admin/admin.model';
import customNanoId from '../../utils/customNanoId';
import { PointsServices } from '../Points/points.service';

// Create Order after redUniq payment
const createOrderAfterRedUniqPayment = async (
  payload: {
    checkoutSummaryId: string;
    paymentToken: string;
    deliveryNotes?: string;
  },
  currentUser: AuthUser,
) => {
  const { checkoutSummaryId, paymentToken, deliveryNotes } = payload;

  const summary = await CheckoutSummary.findById(checkoutSummaryId);
  if (!summary)
    throw new AppError(httpStatus.NOT_FOUND, 'Checkout summary not found');

  if (!process.env.REDUNIQ_API_URL) {
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'REDUNIQ API URL is not configured',
    );
  }

  const verifyPayload = {
    method: 'getResult',
    api: {
      username: config.reduniq.username,
      password: config.reduniq.password,
    },
    token: paymentToken,
  };
  const verifyRes = await axios.post(
    config.reduniq.api_url as string,
    verifyPayload,
  );
  const paymentData = verifyRes.data;

  if (summary.customerId.toString() !== currentUser._id.toString()) {
    throw new AppError(
      httpStatus.UNAUTHORIZED,
      'You are not authorized to view',
    );
  }
  if (summary.isConvertedToOrder) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Checkout summary already converted to order',
    );
  }

  const existingVendor = await Vendor.findById(summary.vendorId);
  if (!existingVendor) {
    throw new AppError(httpStatus.NOT_FOUND, 'Vendor not found');
  }

  if (
    !paymentData ||
    !paymentData.transaction ||
    paymentData.transaction.status !== '4'
  ) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Payment failed. Please try again.',
    );
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

    await Cart.updateOne(
      { customerId: summary.customerId },
      {
        $pull: {
          items: {
            productId: {
              $in: summary.items.map((i) => i.productId.toString()),
            },
          },
        },
        $set: { discount: 0, totalItems: 0, totalPrice: 0 },
      },
      { session },
    );

    await session.commitTransaction();

    OrderPdService.syncOrderWithPd(order._id.toString()).catch((err) => {
      console.error(err);
    });

    const notificationPayload = {
      title: 'You have a new order',
      body: `You have a new order with order id ${order.orderId} and total amount ${order.payoutSummary.grandTotal}. Please check your orders to accept or reject the order.`,
      data: {
        orderId: order.orderId,
      },
    };

    NotificationService.sendToUser(
      existingVendor.userId,
      notificationPayload.title,
      notificationPayload.body,
      notificationPayload.data,
      'order_notification',
      'ORDER',
    );

    return order;
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
};

// update order status by vendor (accept / reject / preparing / cancel)
const updateOrderStatusByVendor = async (
  currentUser: AuthUser,
  orderId: string,
  action: { type: OrderStatus; reason?: string },
) => {
  if (!currentUser || currentUser.role !== 'VENDOR') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'You are not authorized to accept or reject orders.',
    );
  }

  if (currentUser.status !== 'APPROVED') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      `You are not approved to accept or reject orders. Your account is ${currentUser.status}`,
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
      `You are not allowed to change order status to ${action.type}`,
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
    );

    if (!order) {
      throw new AppError(httpStatus.NOT_FOUND, 'Order not found.');
    }
    // ---------------------------------------------------------
    // Only paid orders can be processed
    // ---------------------------------------------------------
    if (!order.isPaid) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'Only paid orders can be accepted or rejected.',
      );
    }

    // ---------------------------------------------------------
    // Prevent duplicate status
    // ---------------------------------------------------------
    if (action.type === order.orderStatus) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        `Order is already ${action.type.toLowerCase()}.`,
      );
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
        `Order must be PENDING to be accepted. Current status is ${order.orderStatus}.`,
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
        `Order must be ASSIGNED before PREPARING`,
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
        `Order must be PREPARING before READY_FOR_PICKUP`,
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
        'Order cannot be canceled or rejected at this stage',
      );
    }

    if (currentUser._id.toString() !== order.vendorId.toString()) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        'You are not authorized to accept or reject orders.',
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
      const stockResult = await Product.bulkWrite(stockOperations, { session });
      if (stockResult.modifiedCount !== order.items.length) {
        throw new AppError(
          httpStatus.BAD_REQUEST,
          'Stock check failed. One or more products are out of stock or inventory was insufficient.',
        );
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
        throw new AppError(
          httpStatus.BAD_REQUEST,
          'Cancel reason is required.',
        );
      }
      order.cancelReason = action.reason;
      // --------------------------------------------------------
      // Add product to stock
      // --------------------------------------------------------
      const stockOperations = order.items.map((item) => ({
        updateOne: {
          filter: { _id: new mongoose.Types.ObjectId(item.productId) },
          update: {
            $inc: { 'stock.quantity': item.itemSummary.quantity },
          },
        },
      }));
      await Product.bulkWrite(stockOperations, { session });
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
        throw new AppError(
          httpStatus.BAD_REQUEST,
          'Reject reason is required.',
        );
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
    return order;
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

// broadcast order to delivery partners
const broadcastOrderToPartners = async (
  orderId: string,
  currentUser: AuthUser,
) => {
  if (!currentUser || currentUser.status !== 'APPROVED') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      `You are not approved. Status: ${currentUser?.status}`,
    );
  }

  // Vendor location check
  const loc = currentUser.currentSessionLocation?.coordinates;
  const longitude = loc?.[0];
  const latitude = loc?.[1];
  if (!loc || typeof longitude !== 'number' || typeof latitude !== 'number') {
    throw new AppError(httpStatus.BAD_REQUEST, 'Vendor location not set.');
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
      `Order already dispatched to ${order.dispatchPartnerPool.length} delivery partners.`,
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
      'Order not found or not accepted.',
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
    throw new AppError(httpStatus.BAD_REQUEST, 'No partner found.');
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
    message: `Order dispatched to ${partnerIds.length} delivery partners.`,
    data: orderDataForPopup,
  };
};

// partner accepts or rejects dispatched order
const partnerAcceptsDispatchedOrder = async (
  currentUser: AuthUser,
  orderId: string,
  payload: {
    action: 'ACCEPT' | 'REJECT';
  },
) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    if (
      currentUser.status !== 'APPROVED' ||
      currentUser.role !== 'DELIVERY_PARTNER'
    ) {
      throw new AppError(httpStatus.FORBIDDEN, 'Partner not approved.');
    }

    const order = await Order.findOne({ orderId })
      .populate('vendorId')
      .session(session);
    if (!order) throw new AppError(httpStatus.NOT_FOUND, 'Order not found.');

    const vendorUserId = (order.vendorId as any)?.userId;
    const io = getIO();

    const isExpired =
      order.dispatchExpiresAt && new Date() > new Date(order.dispatchExpiresAt);

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
      await session.commitTransaction();

      io.to(`user_${currentUser.userId}`).emit('REMOVE_ORDER_POPUP', {
        orderId,
      });
      return {
        data: null,
        message: 'Order request has expired.',
      };
    }

    if (payload.action === 'REJECT') {
      const isInPool = order.dispatchPartnerPool?.includes(currentUser.userId);
      if (!isInPool) throw new AppError(httpStatus.BAD_REQUEST, 'Not in pool.');

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

      await session.commitTransaction();
      io.to(`user_${currentUser.userId}`).emit('REMOVE_ORDER_POPUP', {
        orderId,
      });
      return { data: null, message: 'Order rejected.' };
    }

    if (currentUser.operationalData?.currentOrderId) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        'You already have an active order.',
      );
    }

    const notifiedPartnerIds = [...(order.dispatchPartnerPool || [])];

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
        'Order already claimed or expired.',
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

    await session.commitTransaction();

    notifiedPartnerIds.forEach((id) => {
      io.to(`user_${id}`).emit('REMOVE_ORDER_POPUP', { orderId });
    });

    if (vendorUserId) {
      io.to(`user_${vendorUserId}`).emit('ORDER_ACCEPTED_BY_PARTNER', {
        orderId,
        partnerName: `${currentUser.name.firstName} ${currentUser.name.lastName}`,
      });
    }

    // notification payload
    const notificationPayload = {
      title: `Order is accepted`,
      body: `Order is now accepted by delivery partner`,
      data: {
        orderId,
        orderStatus: claimedOrder.orderStatus,
        type: 'ORDER_STATUS',
      },
    };

    if (vendorUserId) {
      NotificationService.sendToUser(
        vendorUserId!,
        notificationPayload.title,
        notificationPayload.body,
        notificationPayload.data,
        'default',
        'ORDER',
      );
    }

    return { data: claimedOrder, message: 'Order accepted.' };
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    throw error;
  } finally {
    session.endSession();
  }
};

// update order status by delivery partner service
const updateOrderStatusByDeliveryPartner = async (
  orderId: string,
  currentUser: AuthUser,
  deliveryProofImage: string | null,
  payload: {
    orderStatus: OrderStatus;
    reason?: string;
  },
) => {
  if (!currentUser || currentUser.role !== 'DELIVERY_PARTNER') {
    throw new AppError(httpStatus.FORBIDDEN, 'Delivery Partner not found.');
  }

  // VALID state transitions
  const validTransitions: Record<string, string> = {
    [ORDER_STATUS.PICKED_UP]: ORDER_STATUS.READY_FOR_PICKUP,
    [ORDER_STATUS.ON_THE_WAY]: ORDER_STATUS.PICKED_UP,
    [ORDER_STATUS.DELIVERED]: ORDER_STATUS.ON_THE_WAY,
    [ORDER_STATUS.REASSIGNMENT_NEEDED]: ORDER_STATUS.ASSIGNED,
  };

  const requiredCurrentStatus = validTransitions[payload.orderStatus];

  if (!requiredCurrentStatus) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      `You cannot change status to ${payload.orderStatus}.`,
    );
  }

  // REASSIGNMENT needs a reason
  if (
    payload.orderStatus === ORDER_STATUS.REASSIGNMENT_NEEDED &&
    !payload.reason
  ) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Reason is required.');
  }

  if (payload.orderStatus === ORDER_STATUS.DELIVERED && !deliveryProofImage) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Delivery proof image is required.',
    );
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Atomic update attempt
    const updatedOrder = await Order.findOneAndUpdate(
      {
        orderId,
        deliveryPartnerId: currentUser._id.toString(),
        orderStatus: requiredCurrentStatus,
        isDeleted: false,
      },
      {
        $set: {
          orderStatus: payload.orderStatus,
          ...(payload.orderStatus === ORDER_STATUS.DELIVERED && {
            deliveredAt: new Date(),
            ...(deliveryProofImage && {
              'delivery.deliveryProofImage': deliveryProofImage,
            }),
          }),
          ...(payload.orderStatus === ORDER_STATUS.REASSIGNMENT_NEEDED && {
            deliveryPartnerId: null,
            deliveryPartnerCancelReason: payload.reason,
          }),
        },
      },
      { new: true, session },
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
        throw new AppError(httpStatus.NOT_FOUND, 'Order not found.');
      }

      if (orderCheck?.orderStatus === payload.orderStatus) {
        throw new AppError(
          httpStatus.BAD_REQUEST,
          `Order status is already ${payload.orderStatus}.`,
        );
      }
      throw new AppError(
        httpStatus.BAD_REQUEST,
        `Order must be in ${requiredCurrentStatus} to transition to ${payload.orderStatus}.`,
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
          'Delivery Partner not found for this order.',
        );
      }

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

      const { payoutSummary, delivery, _id: orderDbId } = updatedOrder;

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

      const isManagedByFleet = partner?.registeredBy?.model === 'FleetManager';
      const fleetManagerId = isManagedByFleet
        ? partner?.registeredBy?.id
        : null;

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
        { userId: SYSTEM_ADMIN, userModel: 'Admin' },
        {
          $setOnInsert: { walletId: `WAL-A-${customNanoId(8)}` },
          $inc: {
            totalUnpaidTax: roundTo2(commissionVat) || 0,
            totalTax: roundTo2(commissionVat) || 0,
            totalEarnings: roundTo2(deliGoCommissionNet) || 0,
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
          transactionId: `TXN-V-${orderId}`,
          orderId: orderDbId,
          userId: updatedOrder.vendorId,
          userModel: 'Vendor',
          baseAmount: roundTo2(vendorEarningsBeforeTax),
          taxAmount: roundTo2(vendorPayableTax),
          totalAmount: roundTo2(vendorNetPayout),
          type: 'VENDOR_EARNING',
          status: 'SUCCESS',
          paymentMethod: 'WALLET',
          remarks: `Earnings for Order: ${orderId}`,
        },
        {
          transactionId: `TXN-DP-${orderId}`,
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
          transactionId: `TXN-DELIGO-${orderId}`,
          orderId: orderDbId,
          userId: SYSTEM_ADMIN,
          userModel: 'Admin',
          baseAmount: roundTo2(deliGoCommission),
          taxAmount: roundTo2(commissionVat),
          totalAmount: roundTo2(deliGoCommissionNet),
          type: 'PLATFORM_COMMISSION',
          status: 'SUCCESS',
          paymentMethod: 'WALLET',
          remarks: `Commission from Order: ${orderId}`,
        },
      ];

      if (isManagedByFleet && fleetManagerId) {
        transactionsToCreate.push({
          transactionId: `TXN-F-${orderId}`,
          orderId: orderDbId,
          userId: fleetManagerId,
          userModel: 'FleetManager',
          baseAmount: roundTo2(totalDeliveryCharge),
          taxAmount: 0,
          totalAmount: roundTo2(totalDeliveryCharge),
          type: 'FLEET_EARNING',
          status: 'SUCCESS',
          paymentMethod: 'WALLET',
          remarks: `Managed Revenue for Order: ${orderId}`,
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
        { userId: currentUser.userId },
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
    } else if (payload.orderStatus === ORDER_STATUS.REASSIGNMENT_NEEDED) {
      await DeliveryPartner.updateOne(
        { userId: currentUser.userId },
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
        {
          session,
        },
      );
    }
    await session.commitTransaction();
    session.endSession();

    // TODO: Notify Customer (Order is now ON_THE_WAY)
    const customer = await Customer.findById(updatedOrder.customerId).lean();
    const customerId = customer?.userId;
    const vendor = await Vendor.findById(updatedOrder.vendorId).lean();
    const vendorId = vendor?.userId;

    const notificationPayload = {
      title: `Order is now ${payload.orderStatus}`,
      body: `${
        payload.orderStatus === 'PICKED_UP' // TODO: Notify Customer
          ? `Your order ${orderId} is now PICKED_UP.`
          : payload.orderStatus === 'ON_THE_WAY'
            ? `Your order ${orderId} is now ON_THE_WAY.`
            : payload.orderStatus === 'DELIVERED'
              ? `Your order ${orderId} is  DELIVERED. Please leave a review.`
              : `Your order ${orderId} is  ${payload.orderStatus}.`
      } `,
      data: {
        orderId,
        orderStatus: payload.orderStatus,
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
      (payload.orderStatus === 'ON_THE_WAY' ||
        payload.orderStatus === 'DELIVERED')
    ) {
      NotificationService.sendToUser(
        vendorId!,
        notificationPayload.title,
        `${
          payload.orderStatus === 'ON_THE_WAY'
            ? `Order ${orderId} is now ${payload.orderStatus}`
            : payload.orderStatus === 'DELIVERED' &&
              `Order ${orderId} is successfully ${payload.orderStatus} by delivery partner`
        }`,
        notificationPayload.data,
        'default',
        'ORDER',
      );
    }

    return {
      message: 'Order status updated successfully.',
      data: updatedOrder,
    };
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

// get all order service
const getAllOrders = async (
  incomingQuery: Record<string, unknown>,
  currentUser: AuthUser,
) => {
  if (currentUser.status !== 'APPROVED') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      `You are not approved to view orders. Your account is ${currentUser.status}`,
    );
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
      throw new AppError(httpStatus.FORBIDDEN, 'Invalid user role');
  }

  // -----------------------------
  // Build Query with QueryBuilder
  // -----------------------------
  const builder = new QueryBuilder(Order.find(), query)
    .filter()
    .sort()
    .fields()
    .paginate()
    .search(OrderSearchableFields);

  const populateOptions = getPopulateOptions(currentUser?.role, {
    customer:
      'name userId role contactNumber currentSessionLocation profilePhoto NIF',
    vendor: 'name userId role',
    deliveryPartner:
      'name userId role contactNumber currentSessionLocation profilePhoto',
    product: 'productId name',
  });

  populateOptions.forEach((option) => {
    builder.modelQuery = builder.modelQuery.populate(option);
  });

  const meta = await builder.countTotal();
  const data = await builder.modelQuery;

  return { meta, data };
};

// get single order for customer service
const getSingleOrder = async (orderId: string, currentUser: AuthUser) => {
  if (currentUser.status !== 'APPROVED') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      `You are not approved to view the order. Your account is ${currentUser.status}`,
    );
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
        'Invalid role or permission denied',
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
    throw new AppError(httpStatus.NOT_FOUND, 'Order not found');
  }

  return order;
};

// get delivery partners dispatch order service
const getDeliveryPartnersDispatchOrder = async (currentUser: AuthUser) => {
  const orders = await Order.find({
    dispatchPartnerPool: { $in: [currentUser.userId] },
    isDeleted: false,
  }).sort({ createdAt: -1 });

  if (!orders || orders.length === 0) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      'No dispatch orders found for this partner',
    );
  }
  return orders;
};

// get delivery partner current order service
const getDeliveryPartnerCurrentOrder = async (currentUser: AuthUser) => {
  if (currentUser.role !== 'DELIVERY_PARTNER') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'Only delivery partners can access their current order.',
    );
  }
  if (currentUser.operationalData?.currentOrderId === null) {
    throw new AppError(httpStatus.NOT_FOUND, 'No order found for this partner');
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
    throw new AppError(httpStatus.NOT_FOUND, 'No order found for this partner');
  }
  return order;
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
