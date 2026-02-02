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
import { stripe } from '../Payment/payment.service';
import { Cart } from '../Cart/cart.model';
import { Product } from '../Product/product.model';
import generateOtp from '../../utils/generateOtp';
import mongoose from 'mongoose';
import { TDeliveryPartner } from '../Delivery-Partner/delivery-partner.interface';
import { NotificationService } from '../Notification/notification.service';
import { Customer } from '../Customer/customer.model';
import { getPopulateOptions } from '../../utils/getPopulateOptions';
import { Vendor } from '../Vendor/vendor.model';
import { Coupon } from '../Coupon/coupon.model';
import { getIO } from '../../lib/Socket';

// Create Order
const createOrderAfterPayment = async (
  payload: { checkoutSummaryId: string; paymentIntentId: string },
  currentUser: AuthUser,
) => {
  const { checkoutSummaryId, paymentIntentId } = payload;

  const summary = await CheckoutSummary.findById(checkoutSummaryId);
  if (!summary)
    throw new AppError(httpStatus.NOT_FOUND, 'Checkout summary not found');

  const existingVendor = await Vendor.findOne({
    _id: summary.vendorId.toString(),
    isDeleted: false,
  });
  if (!existingVendor) {
    throw new AppError(httpStatus.NOT_FOUND, 'Vendor not found');
  }

  if (summary.customerId.toString() !== currentUser._id.toString())
    throw new AppError(httpStatus.FORBIDDEN, 'Not authorized');

  if (summary.isConvertedToOrder)
    throw new AppError(httpStatus.BAD_REQUEST, 'Already converted');

  // --- Verify Payment ---
  let paymentIntent;
  try {
    paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
  } catch {
    throw new AppError(httpStatus.BAD_REQUEST, 'Unable to verify payment');
  }

  if (paymentIntent.status !== 'succeeded')
    throw new AppError(httpStatus.BAD_REQUEST, 'Payment not completed');

  // --- Transaction ---
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
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
        $set: { couponId: null, discount: 0, totalItems: 0, totalPrice: 0 },
      },
      { session },
    );

    const orderData = {
      orderId: `ORD-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
      customerId: summary.customerId,
      vendorId: summary.vendorId,
      items: summary.items.map((i) => ({
        productId: i.productId,
        name: i.name,
        addons: i.addons,
        quantity: i.quantity,
        price: i.price,
        taxRate: i.taxRate,
        taxAmount: i.taxAmount,
        totalBeforeTax: i.totalBeforeTax,
        subtotal: i.subtotal,
      })),
      totalItems: summary.totalItems,
      totalPrice: summary.totalPrice,
      taxAmount: summary.taxAmount,
      discount: summary.discount,
      deliveryCharge: summary.deliveryCharge,
      subTotal: summary.subtotal,

      couponId: summary.couponId,
      paymentMethod: 'CARD',
      paymentStatus: 'COMPLETED',
      isPaid: true,
      deliveryAddress: summary.deliveryAddress,
      estimatedDeliveryTime: summary.estimatedDeliveryTime,
      transactionId: paymentIntentId,
    };

    const [order] = await Order.create([orderData], { session });

    summary.isConvertedToOrder = true;
    summary.paymentStatus = 'PAID';
    summary.transactionId = paymentIntentId;
    summary.orderId = new mongoose.Types.ObjectId(order._id);

    await summary.save({ session });

    await session.commitTransaction();

    const notificationPayload = {
      title: 'You have a new order',
      body: `You have a new order with order id ${order.orderId} and total amount ${order.totalPrice}. Please check your orders to accept or reject the order.`,
      data: {
        orderId: order.orderId,
      },
    };

    NotificationService.sendToUser(
      existingVendor.userId,
      notificationPayload.title,
      notificationPayload.body,
      notificationPayload.data,
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

      // set delivery otp
      if (!order.deliveryOtp) {
        const { otp: deliveryOtp } = generateOtp();
        order.deliveryOtp = deliveryOtp;
      }

      // --------------------------------------------------------
      // Reduce product stock
      // --------------------------------------------------------
      const stockOperations = order.items.map((item) => ({
        updateOne: {
          filter: {
            _id: new mongoose.Types.ObjectId(item.productId),
            'stock.quantity': { $gte: item.quantity },
          },
          update: {
            $inc: { 'stock.quantity': -item.quantity },
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

      // used coupon count add
      if (order.couponId) {
        await Coupon.updateOne(
          { _id: order.couponId },
          { $inc: { usedCount: +1 } },
          { session },
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
            $inc: { 'stock.quantity': item.quantity },
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
          'ORDER',
        );
      }
      NotificationService.sendToUser(
        customerId!,
        notificationPayload.title,
        notificationPayload.body,
        notificationPayload.data,
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
  const loc = currentUser.businessLocation;
  if (
    !loc ||
    typeof loc.longitude !== 'number' ||
    typeof loc.latitude !== 'number'
  ) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Vendor location not set.');
  }

  const vendorCoordinates: [number, number] = [loc.longitude, loc.latitude];
  const io = getIO();
  // Fetch order AND ensure this vendor owns it
  const order = await Order.findOne({
    orderId,
    vendorId: currentUser._id.toString(),
    isDeleted: false,
  });

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
  };

  partnerIds.forEach((id) => {
    io.to(`user_${id}`).emit('NEW_ORDER_AVAILABLE', orderDataForPopup);
  });

  for (const partnerId of partnerIds) {
    const notificationPayload = {
      title: 'New Order Available',
      body: 'A new order is available for you.',
      data: { orderId: order.orderId },
    };
    NotificationService.sendToUser(
      partnerId,
      notificationPayload.title,
      notificationPayload.body,
      notificationPayload.data,
      'ORDER',
    );
  }

  return {
    message: `Order dispatched to ${partnerIds.length} delivery partners.`,
    data: orderDataForPopup,
  };
};

// Partner accepts dispatched order
const partnerAcceptsDispatchedOrder = async (
  currentUser: AuthUser,
  orderId: string,
  action?: 'reject',
) => {
  if (
    currentUser.status !== 'APPROVED' ||
    currentUser.role !== 'DELIVERY_PARTNER'
  ) {
    throw new AppError(httpStatus.FORBIDDEN, 'Partner not approved.');
  }

  const order = await Order.findOne({ orderId }).populate('vendorId');
  if (!order) {
    throw new AppError(httpStatus.NOT_FOUND, 'Order not found.');
  }
  const vendorUserId = (order.vendorId as any)?.userId;

  const isExpired =
    order.dispatchExpiresAt && new Date() > new Date(order.dispatchExpiresAt);

  if (isExpired && order.orderStatus === 'DISPATCHING') {
    await Order.updateOne(
      { orderId },
      { $set: { orderStatus: 'AWAITING_PARTNER', dispatchPartnerPool: [] } },
    );

    const io = getIO();
    io.to(`user_${currentUser.userId}`).emit('REMOVE_ORDER_POPUP', { orderId });

    if (vendorUserId) {
      io.to(`user_${vendorUserId}`).emit('ORDER_DISPATCH_EXPIRED', {
        orderId,
        message: 'No partner accepted in time (Expired on attempt).',
      });
    }

    throw new AppError(httpStatus.GONE, 'Order request has expired.');
  }

  if (action === 'reject') {
    const isInPool = order.dispatchPartnerPool?.some(
      (id) => id === currentUser.userId,
    );

    if (!isInPool) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'You are not in the dispatch pool.',
      );
    }

    const isLastPartner = order?.dispatchPartnerPool?.length === 1;
    const orderUpdate: any = {
      $pull: { dispatchPartnerPool: currentUser.userId },
    };
    if (isLastPartner) {
      orderUpdate.$set = { orderStatus: 'AWAITING_PARTNER' };
    }
    await Order.updateOne({ orderId }, orderUpdate);
    await DeliveryPartner.updateOne(
      { _id: { $in: currentUser._id } },
      {
        $inc: { 'operationalData.totalRejectedOrders': 1 },
        $set: { 'operationalData.lastActivityAt': new Date() },
      },
    );

    const io = getIO();
    io.to(`user_${currentUser.userId}`).emit('REMOVE_ORDER_POPUP', { orderId });
    return {
      data: null,
      message: 'Order rejected successfully.',
    };
  }

  if (currentUser.operationalData?.currentOrderId) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'You already have an assigned order.',
    );
  }
  const notifiedPartnerIds = order?.dispatchPartnerPool || [];

  // atomic first-come-first-served claim
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
        deliveryPartnerId: currentUser._id.toString(),
        orderStatus: ORDER_STATUS.ASSIGNED,
        dispatchPartnerPool: [],
      },
    },
    { new: true },
  );

  // If null, another partner claimed it
  if (!claimedOrder) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Too late! Another partner already accepted this order.',
    );
  }

  await DeliveryPartner.updateOne(
    { _id: currentUser._id },
    {
      $set: {
        'operationalData.currentOrderId': claimedOrder._id.toString(),
        'operationalData.currentStatus': 'ON_DELIVERY',
      },
      $inc: {
        'operationalData.totalAcceptedOrders': 1,
      },
    },
  );

  const io = getIO();
  notifiedPartnerIds.forEach((id) => {
    if (id !== currentUser.userId) {
      io.to(`user_${id}`).emit('REMOVE_ORDER_POPUP', { orderId });
    }
  });

  if (vendorUserId) {
    io.to(`user_${vendorUserId}`).emit('ORDER_ACCEPTED_BY_PARTNER', {
      orderId,
      partnerName: `${currentUser.name.firstName} ${currentUser.name.lastName}`,
    });
  }

  return {
    data: claimedOrder,
    message: 'Order accepted.',
  };
};

// otp verification by vendor service
const otpVerificationByVendor = async (
  orderId: string,
  otp: string,
  currentUser: AuthUser,
) => {
  if (!currentUser || currentUser.role !== 'VENDOR') {
    throw new AppError(httpStatus.FORBIDDEN, 'Vendor not found.');
  }

  if (currentUser.status !== 'APPROVED') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      `You are not approved to view the order. Your account is ${currentUser.status}`,
    );
  }

  if (!otp || typeof otp !== 'string') {
    throw new AppError(httpStatus.BAD_REQUEST, 'Valid OTP is required.');
  }

  const updatedOrder = await Order.findOneAndUpdate(
    {
      orderId,
      vendorId: currentUser._id.toString(),
      orderStatus: ORDER_STATUS.ASSIGNED,
      isOtpVerified: false,
      deliveryOtp: otp,
      isDeleted: false,
      deliveryPartnerId: { $ne: null },
    },
    {
      $set: {
        isOtpVerified: true,
        deliveryOtp: null,
        orderStatus: ORDER_STATUS.PICKED_UP,
        pickedUpAt: new Date(),
      },
    },
    { new: true },
  );

  if (!updatedOrder) {
    const orderCheck = await Order.findOne({
      orderId,
      vendorId: currentUser._id.toString(),
    });

    if (!orderCheck) {
      throw new AppError(
        httpStatus.NOT_FOUND,
        'Order not found for this vendor.',
      );
    }
    if (orderCheck.isOtpVerified) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        `OTP is already verified. Order status is ${orderCheck.orderStatus}`,
      );
    }
    if (orderCheck.orderStatus !== ORDER_STATUS.ASSIGNED) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        `Order status is ${orderCheck.orderStatus}, cannot verify OTP.`,
      );
    }

    throw new AppError(
      httpStatus.UNAUTHORIZED,
      'Invalid OTP or order status/assignment is incorrect.',
    );
  }

  if (updatedOrder.deliveryPartnerId) {
    await DeliveryPartner.findByIdAndUpdate(updatedOrder.deliveryPartnerId, {
      $set: {
        'operationalData.currentStatus': 'ON_DELIVERY',
        'operationalData.lastActivityAt': new Date(),
      },
    });
  }

  // TODO: Notify Customer & Delivery Partner (Order is now PICKED_UP)
  const customer = await Customer.findById(updatedOrder.customerId).lean();
  const customerId = customer?.userId;
  const deliveryPartner = await DeliveryPartner.findById(
    updatedOrder.deliveryPartnerId,
  ).lean();
  const deliveryPartnerId = deliveryPartner?.userId;
  const notificationPayload = {
    title: 'Order is now PICKED_UP',
    body: `Your order ${orderId} is now PICKED_UP.`,
    data: {
      orderId,
      orderStatus: ORDER_STATUS.PICKED_UP,
    },
  };
  if (customerId) {
    NotificationService.sendToUser(
      customerId!,
      notificationPayload.title,
      notificationPayload.body,
      notificationPayload.data,
      'ORDER',
    );
  }
  if (deliveryPartnerId) {
    NotificationService.sendToUser(
      deliveryPartnerId!,
      notificationPayload.title,
      notificationPayload.body,
      notificationPayload.data,
      'ORDER',
    );
  }

  return {
    message: `OTP is verified. Order status is ${updatedOrder.orderStatus}`,
    data: updatedOrder,
  };
};

// update order status by delivery partner service
const updateOrderStatusByDeliveryPartner = async (
  orderId: string,
  payload: { orderStatus: OrderStatus; reason?: string },
  currentUser: AuthUser,
) => {
  if (!currentUser || currentUser.role !== 'DELIVERY_PARTNER') {
    throw new AppError(httpStatus.FORBIDDEN, 'Delivery Partner not found.');
  }

  // VALID state transitions
  const validTransitions: Record<string, string> = {
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
        }),
        ...(payload.orderStatus === ORDER_STATUS.REASSIGNMENT_NEEDED && {
          deliveryPartnerId: null,
          deliveryPartnerCancelReason: payload.reason,
        }),
      },
    },
    { new: true },
  );

  if (!updatedOrder) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Order must be in ${requiredCurrentStatus} to transition to ${payload.orderStatus}.`,
    );
  }

  // Update partner record
  if (payload.orderStatus === ORDER_STATUS.DELIVERED) {
    const pickupTime = updatedOrder.pickedUpAt
      ? new Date(updatedOrder.pickedUpAt).getTime()
      : Date.now();
    const deliveryTime = new Date().getTime();
    const durationMinutes = Math.max(
      1,
      Math.round((deliveryTime - pickupTime) / 60000),
    );
    const deliveryFee = updatedOrder.deliveryCharge || 0;

    await DeliveryPartner.updateOne(
      { userId: currentUser.userId },
      {
        $set: {
          'operationalData.currentOrderId': null,
          'operationalData.currentStatus': 'IDLE',
        },
        $inc: {
          'operationalData.completedDeliveries': 1,
          'operationalData.totalDeliveryMinutes': durationMinutes,
          'earnings.totalEarnings': deliveryFee,
        },
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
    );
  }

  //

  // TODO: Notify Customer (Order is now ON_THE_WAY)
  const customer = await Customer.findById(updatedOrder.customerId).lean();
  const customerId = customer?.userId;
  const notificationPayload = {
    title: `Order is now ${payload.orderStatus}`,
    body: `${
      payload.orderStatus === 'ON_THE_WAY'
        ? `Your order ${orderId} is now ON_THE_WAY.`
        : payload.orderStatus === 'DELIVERED'
          ? `Your order ${orderId} is  DELIVERED. Please leave a review.`
          : `Your order ${orderId} is  ${payload.orderStatus}.`
    } `,
    data: {
      orderId,
      orderStatus: payload.orderStatus,
    },
  };
  NotificationService.sendToUser(
    customerId!,
    notificationPayload.title,
    notificationPayload.body,
    notificationPayload.data,
    'ORDER',
  );

  return {
    message: 'Order status updated successfully.',
    data: updatedOrder,
  };
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
    customer: 'name userId role',
    vendor: 'name userId role',
    deliveryPartner: 'name userId role contactNumber',
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
    customer: 'name userId role',
    vendor: 'name userId role',
    deliveryPartner: 'name userId role contactNumber',
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

export const OrderServices = {
  createOrderAfterPayment,
  getAllOrders,
  getSingleOrder,
  updateOrderStatusByVendor,
  broadcastOrderToPartners,
  partnerAcceptsDispatchedOrder,
  otpVerificationByVendor,
  updateOrderStatusByDeliveryPartner,
};
