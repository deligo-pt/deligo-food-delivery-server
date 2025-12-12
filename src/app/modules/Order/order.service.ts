/* eslint-disable @typescript-eslint/no-explicit-any */
import httpStatus from 'http-status';
import { AuthUser } from '../../constant/user.constant';
import AppError from '../../errors/AppError';
import { Order } from './order.model';
import { QueryBuilder } from '../../builder/QueryBuilder';
import { findUserByEmailOrId } from '../../utils/findUserByEmailOrId';
import crypto from 'crypto';
import {
  BLOCKED_FOR_ORDER_CANCEL,
  DELIVERY_SEARCH_TIERS_METERS,
  ORDER_STATUS,
  OrderSearchableFields,
} from './order.constant';
import { DeliveryPartner } from '../Delivery-Partner/delivery-partner.model';
import { CheckoutSummary } from '../Checkout/checkout.model';
import { stripe } from '../Payment/payment.service';
import { Cart } from '../Cart/cart.model';
import { Product } from '../Product/product.model';
import generateOtp from '../../utils/generateOtp';
import mongoose from 'mongoose';
import { TDeliveryPartner } from '../Delivery-Partner/delivery-partner.interface';

// Create Order
const createOrderAfterPayment = async (
  payload: { checkoutSummaryId: string; paymentIntentId: string },
  currentUser: AuthUser
) => {
  // --- Authorization ---
  const result = await findUserByEmailOrId({
    userId: currentUser?.id,
    isDeleted: false,
  });
  const loggedInUser = result.user;

  const { checkoutSummaryId, paymentIntentId } = payload;

  const summary = await CheckoutSummary.findById(checkoutSummaryId);
  if (!summary)
    throw new AppError(httpStatus.NOT_FOUND, 'Checkout summary not found');

  if (summary.customerId !== loggedInUser.userId)
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
          items: { productId: { $in: summary.items.map((i) => i.productId) } },
        },
        $inc: {
          totalItems: -summary.totalItems,
          totalPrice: -summary.totalPrice,
        },
      },
      { session }
    );

    const orderData = {
      orderId: `ORD-${crypto.randomUUID()}`,
      customerId: summary.customerId,
      vendorId: summary.vendorId,
      items: summary.items.map((i) => ({
        productId: i.productId,
        name: i.name,
        quantity: i.quantity,
        price: i.price,
        subtotal: i.subtotal,
      })),
      totalItems: summary.totalItems,
      totalPrice: summary.totalPrice,
      discount: summary.discount,
      finalAmount: summary.finalAmount,
      paymentMethod: 'CARD',
      paymentStatus: 'COMPLETED',
      isPaid: true,
      deliveryAddress: summary.deliveryAddress,
      deliveryCharge: summary.deliveryCharge,
      estimatedDeliveryTime: summary.estimatedDeliveryTime,
      transactionId: paymentIntentId,
    };

    const [order] = await Order.create([orderData], { session });

    summary.isConvertedToOrder = true;
    summary.paymentStatus = 'PAID';
    summary.transactionId = paymentIntentId;
    summary.orderId = order.orderId;
    await summary.save({ session });

    await session.commitTransaction();
    return order;
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
};

// get all order service
const getAllOrders = async (
  incomingQuery: Record<string, unknown>,
  currentUser: AuthUser
) => {
  // -----------------------------
  // User Verification
  // -----------------------------
  const result = await findUserByEmailOrId({
    userId: currentUser.id,
    isDeleted: false,
  });

  const loggedInUser = result.user;

  if (loggedInUser.status !== 'APPROVED') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      `You are not approved to view orders. Your account is ${loggedInUser.status}`
    );
  }

  // -----------------------------
  // Create a SAFE query object
  // -----------------------------
  const query: Record<string, unknown> = { ...incomingQuery };

  // -----------------------------
  // Role-Based Query Filters
  // -----------------------------
  switch (loggedInUser.role) {
    case 'VENDOR':
      query.vendorId = loggedInUser.userId;
      break;

    case 'CUSTOMER':
      query.customerId = loggedInUser.userId;
      break;

    case 'DELIVERY_PARTNER':
      query.deliveryPartnerId = loggedInUser.userId;
      break;

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

  const meta = await builder.countTotal();
  const data = await builder.modelQuery;

  return { meta, data };
};

// get single order for customer service
const getSingleOrder = async (orderId: string, currentUser: AuthUser) => {
  // ------------------------------------------------------
  // Authenticate & authorize user
  // ------------------------------------------------------
  const result = await findUserByEmailOrId({
    userId: currentUser.id,
    isDeleted: false,
  });

  const loggedInUser = result.user;

  if (loggedInUser.status !== 'APPROVED') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      `You are not approved to view the order. Your account is ${loggedInUser.status}`
    );
  }

  const userId = loggedInUser.userId;

  // ------------------------------------------------------
  // Build role-based query filter securely
  // ------------------------------------------------------
  const filter: Record<string, unknown> = {};

  switch (loggedInUser.role) {
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
        'Invalid role or permission denied'
      );
  }

  // ------------------------------------------------------
  // Fetch order using secure filter
  // ------------------------------------------------------
  const order = await Order.findOne({ orderId, ...filter });

  if (!order) {
    throw new AppError(httpStatus.NOT_FOUND, 'Order not found');
  }

  return order;
};

// accept or reject order by vendor service
const acceptOrRejectOrderByVendor = async (
  currentUser: AuthUser,
  orderId: string,
  action: { type: keyof typeof ORDER_STATUS; reason?: string }
) => {
  // ---------------------------------------------------------
  // Ensure current user is an approved vendor
  // ---------------------------------------------------------
  const result = await findUserByEmailOrId({
    userId: currentUser.id,
    isDeleted: false,
  });

  const loggedInUser = result.user;
  if (!loggedInUser || loggedInUser.role !== 'VENDOR') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'You are not authorized to accept or reject orders.'
    );
  }

  if (loggedInUser.status !== 'APPROVED') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      `You are not approved to accept or reject orders. Your account is ${loggedInUser.status}`
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
        vendorId: loggedInUser.userId,
        isDeleted: false,
      },
      null,
      { session }
    );

    if (!order) {
      throw new AppError(httpStatus.NOT_FOUND, 'Order not found.');
    }

    // ---------------------------------------------------------
    // Prevent duplicate status
    // ---------------------------------------------------------
    if (action.type === order.orderStatus) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        `Order is already ${action.type.toLowerCase()}.`
      );
    }

    // ---------------------------------------------------------
    // Only paid orders can be processed
    // ---------------------------------------------------------
    if (!order.isPaid) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'Only paid orders can be accepted or rejected.'
      );
    }

    if (loggedInUser.userId !== order.vendorId) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        'You are not authorized to accept or reject orders.'
      );
    }

    // ---------------------------------------------------------
    // Prevent vendor from if action type are not accepted, rejected, or canceled
    // ---------------------------------------------------------
    if (
      action.type !== 'ACCEPTED' &&
      action.type !== 'REJECTED' &&
      action.type !== 'CANCELED'
    ) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        `You are not authorized to change order status to ${action.type.toLowerCase()}. Please contact support.`
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
        'Cannot cancel or reject an order that is already assigned, picked up, on the way, or delivered. Please contact support if you need to cancel the order'
      );
    }

    // ---------------------------------------------------------
    // Only pending orders are allowed to be accepted/rejected
    // ---------------------------------------------------------
    if (action.type === 'ACCEPTED' && order.orderStatus !== 'PENDING') {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        `Order must be PENDING to be accepted. Current status is ${order.orderStatus}.`
      );
    }
    // ---------------------------------------------------------
    // If ACCEPTED → set pickup address from vendor location and reduce product stock
    // ---------------------------------------------------------
    if (action.type === 'ACCEPTED') {
      if (!order.pickupAddress) {
        order.pickupAddress = {
          street: loggedInUser.businessLocation.street || '',
          city: loggedInUser.businessLocation.city || '',
          state: loggedInUser.businessLocation.state || '',
          country: loggedInUser.businessLocation.country || '',
          postalCode: loggedInUser.businessLocation.postalCode || '',
          longitude: loggedInUser.businessLocation.longitude,
          latitude: loggedInUser.businessLocation.latitude,
          geoAccuracy: loggedInUser.businessLocation.geoAccuracy,
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
            productId: item.productId,
            'stock.quantity': { $gte: item.quantity },
          },
          update: {
            $inc: { 'stock.quantity': -item.quantity },
          },
        },
      }));
      const stockResult = await Product.bulkWrite(stockOperations, { session });
      if (stockResult.modifiedCount !== order.items.length) {
        await session.abortTransaction();
        session.endSession();
        throw new AppError(
          httpStatus.BAD_REQUEST,
          'Stock check failed. One or more products are out of stock or inventory was insufficient.'
        );
      }
    }

    // ---------------------------------------------------------
    // If Canceled → add cancel reason and add product to stock
    // ---------------------------------------------------------
    if (action.type === 'CANCELED') {
      if (!action.reason) {
        throw new AppError(
          httpStatus.BAD_REQUEST,
          'Cancel reason is required.'
        );
      }
      order.cancelReason = action.reason;
      // --------------------------------------------------------
      // Add product to stock
      // --------------------------------------------------------
      const stockOperations = order.items.map((item) => ({
        updateOne: {
          filter: { productId: item.productId },
          update: {
            $inc: { 'stock.quantity': item.quantity },
          },
        },
      }));
      await Product.bulkWrite(stockOperations, { session });
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
  currentUser: AuthUser
) => {
  // Auth check
  const result = await findUserByEmailOrId({
    userId: currentUser.id,
    isDeleted: false,
  });
  const loggedInUser = result.user;

  if (!loggedInUser || loggedInUser.status !== 'APPROVED') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      `You are not approved. Status: ${loggedInUser?.status}`
    );
  }

  // Vendor location check
  const loc = loggedInUser.businessLocation;
  if (
    !loc ||
    typeof loc.longitude !== 'number' ||
    typeof loc.latitude !== 'number'
  ) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Vendor location not set.');
  }

  const vendorCoordinates: [number, number] = [loc.longitude, loc.latitude];

  // Fetch order AND ensure this vendor owns it
  const order = await Order.findOne({
    orderId,
    vendorId: loggedInUser.userId,
    isDeleted: false,
  });
  if (
    !order ||
    !['ACCEPTED', 'AWAITING_PARTNER', 'REASSIGNMENT_NEEDED'].includes(
      order.orderStatus
    )
  ) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Order not found or not accepted.'
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
      { $set: { orderStatus: ORDER_STATUS.AWAITING_PARTNER } }
    );
    throw new AppError(httpStatus.BAD_REQUEST, 'No partner found.');
  }

  const partnerIds = eligiblePartners.map((p) => p.userId);

  // Safe atomic update using $addToSet and status update
  await Order.updateOne(
    { orderId, vendorId: loggedInUser.userId, isDeleted: false },
    {
      $set: { orderStatus: ORDER_STATUS.DISPATCHING },
      $addToSet: { dispatchPartnerPool: { $each: partnerIds } },
    }
  );

  return {
    message: `Order dispatched to ${partnerIds.length} delivery partners. The partner IDs are [ ${partnerIds} ].`,
    partnerIds,
  };
};

// Partner accepts dispatched order
const partnerAcceptsDispatchedOrder = async (
  currentUser: AuthUser,
  orderId: string
) => {
  // Validate partner
  const partner = await DeliveryPartner.findOne({
    userId: currentUser.id,
    isDeleted: false,
    status: 'APPROVED',
  });

  if (!partner) {
    throw new AppError(httpStatus.FORBIDDEN, 'Partner not approved.');
  }

  if (partner.operationalData?.currentOrderId) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'You already have an assigned order.'
    );
  }

  // atomic first-come-first-served claim
  const claimedOrder = await Order.findOneAndUpdate(
    {
      orderId,
      orderStatus: ORDER_STATUS.DISPATCHING,
      deliveryPartnerId: null,
      dispatchPartnerPool: { $in: [partner.userId] },
    },
    {
      $set: {
        deliveryPartnerId: partner.userId,
        orderStatus: ORDER_STATUS.ASSIGNED,
        dispatchPartnerPool: [],
      },
    },
    { new: true }
  );

  // If null, another partner claimed it
  if (!claimedOrder) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Too late! Another partner already accepted this order.'
    );
  }

  // Update partner state
  await DeliveryPartner.updateOne(
    { userId: partner.userId },
    {
      $set: {
        'operationalData.currentOrderIds': orderId,
        'operationalData.currentStatus': 'ON_DELIVERY',
      },
    }
  );

  return claimedOrder;
};

// otp verification by vendor service
const otpVerificationByVendor = async (
  orderId: string,
  otp: string,
  currentUser: AuthUser
) => {
  const result = await findUserByEmailOrId({
    userId: currentUser.id,
    isDeleted: false,
  });
  const loggedInUser = result.user;

  if (loggedInUser.status !== 'APPROVED') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      `You are not approved to view the order. Your account is ${loggedInUser.status}`
    );
  }

  if (!otp) {
    throw new AppError(httpStatus.BAD_REQUEST, 'OTP is required.');
  }

  const updatedOrder = await Order.findOneAndUpdate(
    {
      orderId,
      vendorId: loggedInUser.userId,
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
    { new: true }
  );

  if (!updatedOrder) {
    const orderCheck = await Order.findOne({
      orderId,
      vendorId: loggedInUser.userId,
    });

    if (!orderCheck) {
      throw new AppError(
        httpStatus.NOT_FOUND,
        'Order not found for this vendor.'
      );
    }
    if (orderCheck.isOtpVerified) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'OTP already verified and order picked up.'
      );
    }
    if (orderCheck.orderStatus !== ORDER_STATUS.ASSIGNED) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        `Order status is ${orderCheck.orderStatus}, cannot verify OTP.`
      );
    }

    throw new AppError(
      httpStatus.UNAUTHORIZED,
      'Invalid OTP or order status/assignment is incorrect.'
    );
  }

  // TODO: Notify Customer & Delivery Partner (Order is now PICKED_UP)

  return {
    message: 'OTP verified successfully. Order is now PICKED_UP',
    data: updatedOrder,
  };
};

// update order status by delivery partner service
const updateOrderStatusByDeliveryPartner = async (
  orderId: string,
  payload: { orderStatus: keyof typeof ORDER_STATUS; reason?: string },
  currentUser: AuthUser
) => {
  // Validate partner
  const result = await findUserByEmailOrId({
    userId: currentUser.id,
    isDeleted: false,
  });

  const partner = result.user;

  if (!partner || partner.status !== 'APPROVED') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      `You are not approved. Status: ${partner?.status}`
    );
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
      `You cannot change status to ${payload.orderStatus}.`
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
      deliveryPartnerId: partner.userId,
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
    { new: true }
  );

  if (!updatedOrder) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Order must be in ${requiredCurrentStatus} to transition to ${payload.orderStatus}.`
    );
  }

  // Update partner record
  const shouldReleasePartner =
    payload.orderStatus === ORDER_STATUS.DELIVERED ||
    payload.orderStatus === ORDER_STATUS.REASSIGNMENT_NEEDED;

  if (shouldReleasePartner) {
    await DeliveryPartner.updateOne(
      { userId: partner.userId },
      {
        $set: {
          'operationalData.currentOrderId': null,
          'operationalData.currentStatus': 'IDLE',
        },
      }
    );
  }

  return {
    message: 'Order status updated successfully.',
    data: updatedOrder,
  };
};

export const OrderServices = {
  createOrderAfterPayment,
  getAllOrders,
  getSingleOrder,
  acceptOrRejectOrderByVendor,
  broadcastOrderToPartners,
  partnerAcceptsDispatchedOrder,
  otpVerificationByVendor,
  updateOrderStatusByDeliveryPartner,
};
