/* eslint-disable @typescript-eslint/no-explicit-any */
import httpStatus from 'http-status';
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
import axios from 'axios';
import config from '../../config';
import { Transaction } from '../Transaction/transaction.model';
import customNanoId from '../../utils/customNanoId';
import { orderQueue } from '../../BullMQ/Queue/order.queue';
import { TAuthUser } from '../AuthUser/authUser.interface';
import { AuthUser } from '../AuthUser/authUser.model';

// Create Order after redUniq payment
const createOrderAfterRedUniqPayment = async (
  payload: {
    checkoutSummaryId: string;
    paymentToken: string;
    deliveryNotes?: string;
  },
  currentUser: TAuthUser,
) => {
  const { checkoutSummaryId, paymentToken, deliveryNotes } = payload;

  const summary = await CheckoutSummary.findById(checkoutSummaryId);
  if (!summary)
    throw new AppError(httpStatus.NOT_FOUND, 'Checkout summary not found');

  if (summary.customerId.toString() !== currentUser._id.toString()) {
    throw new AppError(
      httpStatus.UNAUTHORIZED,
      'You are not authorized to process this order',
    );
  }

  if (summary.isConvertedToOrder) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'This checkout summary has already been converted to an order',
    );
  }

  if (!config.redUniq?.api_url) {
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'REDUNIQ API URL is not configured',
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

  const existingVendor = await AuthUser.findById(summary.vendorId);
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
          userObjectId: currentUser?._id,
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

    await orderQueue.add('NEW_ORDER_POST_PROCESS', {
      orderId: order._id.toString(),
      vendorId: existingVendor._id.toString(),
      vendorUserId: existingVendor.userId,
      orderDisplayId: order.orderId,
      grandTotal: order.payoutSummary.grandTotal,
    });

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
  currentUser: TAuthUser,
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

  const vendorProfile = await Vendor.findById(currentUser.userObjectId).lean();

  if (!vendorProfile) {
    throw new AppError(httpStatus.NOT_FOUND, 'Vendor profile not found');
  }
  const vendorBusinessLocation = vendorProfile.businessLocation as any;

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

  let pendingNotification: (() => void) | null = null;

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

    if (currentUser._id.toString() !== order.vendorId.toString()) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        'You are not authorized to accept or reject orders.',
      );
    }

    const isRestaurant =
      vendorProfile?.businessDetails?.businessType?.toUpperCase() ===
      'RESTAURANT';

    const shouldCheckStock = !isRestaurant;
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
    const customer = await AuthUser.findById(order.customerId, null, {
      session,
    });
    const customerId = customer?.userId;

    const deliveryPartner = order.deliveryPartnerId
      ? await AuthUser.findById(order.deliveryPartnerId, null, {
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

    if (action.type === 'REJECTED' && order.orderStatus !== 'PENDING') {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        `You cannot REJECT this order because it is already ${order.orderStatus.toLowerCase()}. If you must cancel, please use the CANCELED action with a proper reason.`,
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
      action.type === 'CANCELED' &&
      BLOCKED_FOR_ORDER_CANCEL.some((status) => order.orderStatus === status)
    ) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'Order cannot be canceled or rejected at this stage',
      );
    }

    // ---------------------------------------------------------
    // If ACCEPTED → set pickup address from vendor location and reduce product stock
    // ---------------------------------------------------------
    if (action.type === 'ACCEPTED') {
      if (!order.pickupAddress) {
        order.pickupAddress = {
          street: vendorBusinessLocation?.street || '',
          city: vendorBusinessLocation?.city || '',
          state: vendorBusinessLocation?.state || '',
          country: vendorBusinessLocation?.country || '',
          postalCode: vendorBusinessLocation?.postalCode || '',
          longitude: vendorBusinessLocation?.longitude || 0,
          latitude: vendorBusinessLocation?.latitude || 0,
          geoAccuracy: vendorBusinessLocation?.geoAccuracy,
          detailedAddress: vendorBusinessLocation?.detailedAddress || '',
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
          throw new AppError(
            httpStatus.BAD_REQUEST,
            'Stock check failed. One or more products are out of stock or inventory was insufficient.',
          );
        }
      }

      pendingNotification = () => {
        NotificationService.sendToUser(
          customerId!,
          'Order Accepted',
          `Your order has been accepted by ${vendorProfile.businessDetails?.businessName}. Please wait for your order to be picked up.`,
          { orderId: order.orderId },
          'default',
          'ORDER',
        );
      };
    }
    // ---------------------------------------------------------
    // PREPARING logic
    // ---------------------------------------------------------
    if (action.type === 'PREPARING') {
      pendingNotification = () => {
        NotificationService.sendToUser(
          customerId!,
          'Order is being prepared',
          `Your order is now being prepared by ${vendorProfile.businessDetails?.businessName}.`,
          { orderId: order.orderId.toString(), status: 'PREPARING' },
          'default',
          'ORDER',
        );
      };
    }

    // ---------------------------------------------------------
    // Ready for pickup logic
    // ---------------------------------------------------------
    if (action.type === 'READY_FOR_PICKUP') {
      pendingNotification = () => {
        NotificationService.sendToUser(
          customerId!,
          'Order is ready for pickup',
          `Your order is now ready for pickup by ${vendorProfile.businessDetails?.businessName}.`,
          { orderId: order.orderId, status: 'READY_FOR_PICKUP' },
          'default',
          'ORDER',
        );
      };
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
      if (shouldCheckStock && order.orderStatus !== 'PENDING') {
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
      pendingNotification = () => {
        NotificationService.sendToUser(
          customerId!,
          'Order Canceled',
          `Your order has been canceled for ${action.reason}`,
          { orderId: order.orderId },
          'default',
          'ORDER',
        );

        if (order.deliveryPartnerId) {
          NotificationService.sendToUser(
            deliveryPartnerId!,
            'Order Canceled',
            `The order assigned to you has been canceled by the vendor.`,
            { orderId: order.orderId },
            'default',
            'ORDER',
          );
        }
      };
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

      pendingNotification = () => {
        NotificationService.sendToUser(
          customerId!,
          'Order Rejected',
          `Your order has been rejected for ${action.reason}`,
          { orderId: order.orderId },
          'default',
          'ORDER',
        );
      };
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

    if (pendingNotification) {
      pendingNotification();
    }
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
  currentUser: TAuthUser,
) => {
  if (!currentUser || currentUser.status !== 'APPROVED') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      `You are not approved. Status: ${currentUser?.status}`,
    );
  }

  const vendorProfile = await Vendor.findById(currentUser.userObjectId).lean();
  if (!vendorProfile) {
    throw new AppError(httpStatus.NOT_FOUND, 'Vendor not found.');
  }

  // Vendor location check
  const loc = vendorProfile.businessLocation;

  const longitude = loc?.longitude;
  const latitude = loc?.latitude;
  if (!loc || typeof longitude !== 'number' || typeof latitude !== 'number') {
    throw new AppError(httpStatus.BAD_REQUEST, 'Vendor location not set.');
  }

  const vendorCoordinates: [number, number] = [longitude, latitude];
  const io = getIO();
  // Fetch order AND ensure this vendor owns it
  const order = await Order.findOne({
    orderId,
    vendorId: currentUser._id,
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

      {
        $lookup: {
          from: 'authusers',
          localField: 'userId',
          foreignField: 'userId',
          as: 'authAccount',
        },
      },
      { $unwind: { path: '$authAccount', preserveNullAndEmptyArrays: false } },

      {
        $match: {
          'authAccount.status': 'APPROVED',
          'authAccount.isDeleted': false,
        },
      },
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
    { orderId, vendorId: currentUser._id, isDeleted: false },
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
    vendorName: vendorProfile?.businessDetails?.businessName,
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
  currentUser: TAuthUser,
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

    const partnerProfile = await DeliveryPartner.findById(
      currentUser.userObjectId,
    )
      .lean()
      .select('name operationalData currentSessionLocation');
    if (!partnerProfile) {
      throw new AppError(httpStatus.NOT_FOUND, 'Delivery partner not found.');
    }

    const order = await Order.findOne({ orderId })
      .populate('vendorId', 'userId')
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
        { _id: partnerProfile._id },
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

    if (partnerProfile.operationalData?.currentOrderId) {
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
      { _id: partnerProfile._id },
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
        partnerName: `${partnerProfile?.name?.firstName} ${partnerProfile?.name?.lastName}`,
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
  currentUser: TAuthUser,
  payload: {
    orderStatus: OrderStatus;
    deliveryProofImage: string | null;
    reason?: string;
  },
) => {
  const { orderStatus, deliveryProofImage, reason } = payload;
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

  const requiredCurrentStatus = validTransitions[orderStatus];

  if (!requiredCurrentStatus) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      `You cannot change status to ${orderStatus}.`,
    );
  }

  // REASSIGNMENT needs a reason
  if (orderStatus === ORDER_STATUS.REASSIGNMENT_NEEDED && !reason) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Reason is required.');
  }

  if (orderStatus === ORDER_STATUS.DELIVERED && !deliveryProofImage) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Delivery proof image is required.',
    );
  }

  const updatedOrder = await Order.findOneAndUpdate(
    {
      orderId,
      deliveryPartnerId: currentUser._id,
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
    const partner = await AuthUser.findById(updatedOrder?.deliveryPartnerId);
    if (!partner) {
      throw new AppError(
        httpStatus.NOT_FOUND,
        'Delivery Partner not found for this order.',
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
    message: 'Order status updated successfully.',
    data: updatedOrder,
  };
};

// get all order service
const getAllOrders = async (
  incomingQuery: Record<string, unknown>,
  currentUser: TAuthUser,
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
const getSingleOrder = async (orderId: string, currentUser: TAuthUser) => {
  if (currentUser.status !== 'APPROVED') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      `You are not approved to view the order. Your account is ${currentUser.status}`,
    );
  }

  const userObjectId = currentUser._id;
  // ------------------------------------------------------
  // Build role-based query filter securely
  // ------------------------------------------------------
  const filter: Record<string, unknown> = {};

  switch (currentUser.role) {
    case 'CUSTOMER':
      filter.customerId = userObjectId;
      break;

    case 'VENDOR':
      filter.vendorId = userObjectId;
      break;

    case 'DELIVERY_PARTNER':
      filter.deliveryPartnerId = userObjectId;
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
const getDeliveryPartnersDispatchOrder = async (currentUser: TAuthUser) => {
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
const getDeliveryPartnerCurrentOrder = async (currentUser: TAuthUser) => {
  if (currentUser.role !== 'DELIVERY_PARTNER') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'Only delivery partners can access their current order.',
    );
  }

  const partnerProfile = await DeliveryPartner.findById(
    currentUser.userObjectId,
  ).lean();

  if (!partnerProfile) {
    throw new AppError(httpStatus.NOT_FOUND, 'Delivery partner not found.');
  }

  if (partnerProfile.operationalData?.currentOrderId === null) {
    throw new AppError(httpStatus.NOT_FOUND, 'No order found for this partner');
  }
  const order = await Order.findOne({
    _id: partnerProfile.operationalData?.currentOrderId,
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
