/* eslint-disable @typescript-eslint/no-explicit-any */
import httpStatus from 'http-status';
import AppError from '../../errors/AppError';
import { GlobalSettingsService } from '../GlobalSetting/globalSetting.service';
import { Order } from '../Order/order.model';
import { Points, PointsLog, Referral } from './loyalty.model';
import mongoose, { ClientSession, Types } from 'mongoose';
import { AuthUser } from '../../constant/user.constant';
import { QueryBuilder } from '../../builder/QueryBuilder';
import { Customer } from '../Customer/customer.model';

/**
 * Adds loyalty points to a customer based on their order amount.
 * Formula: Order Amount * Global Points Per Euro Rate.
 */
const addOrderPoints = async (
  userId: Types.ObjectId | string,
  orderId: string,
  externalSession?: ClientSession,
) => {
  const role = 'CUSTOMER';
  const session = externalSession || (await mongoose.startSession());

  if (!externalSession) session.startTransaction();

  try {
    // 1. Check if points were already granted for this specific order
    const alreadyReceived = await PointsLog.findOne({
      'userId.id': userId,
      referenceId: orderId,
      transactionType: 'EARN',
    }).session(session);

    if (alreadyReceived) {
      // Exit silently if already granted to prevent double points
      if (!externalSession) await session.commitTransaction();
      return {
        message: 'Points already granted for this order',
        pointsEarned: 0,
      };
    }

    // 2. Fetch order and validate existence
    const existsOrder = await Order.findById(orderId).session(session);

    if (!existsOrder) {
      throw new AppError(httpStatus.NOT_FOUND, 'Order not found.');
    }
    // 3. Security: Ensure the points are being added for the correct customer
    if (existsOrder.customerId?.toString() !== userId.toString()) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        'Unauthorized: This order does not belong to the specified user.',
      );
    }

    // 4. Status Check: Only grant points if the order is actually DELIVERED
    if (existsOrder.orderStatus !== 'DELIVERED') {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        `Points can only be earned for DELIVERED orders. Current status: ${existsOrder.orderStatus}`,
      );
    }

    // 5. Calculate points based on settings
    const orderAmount = existsOrder.payoutSummary.grandTotal;
    const settings = await GlobalSettingsService.getGlobalSettings(session);

    if (!settings) {
      throw new AppError(
        httpStatus.INTERNAL_SERVER_ERROR,
        'Global settings could not be retrieved.',
      );
    }

    const rewards = settings.rewards;
    const pointsToAdd = Math.floor(
      orderAmount * (rewards?.customerPointsPerEuro || 10),
    );

    const expiryDays = rewards?.pointsExpiryDays || 365;

    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + expiryDays);

    if (pointsToAdd > 0) {
      // 6. Update user's point balance (Atomic Increment)
      await Points.findOneAndUpdate(
        { 'userId.id': userId },
        {
          $inc: { currentPoints: pointsToAdd, totalEarned: pointsToAdd },
          $set: { expiryDate },
          $setOnInsert: {
            'userId.id': userId,
            'userId.model': 'Customer',
            'userId.role': role,
          },
        },
        { upsert: true, session, new: true },
      );

      // 7. Record the point transaction in audit log
      await PointsLog.create(
        [
          {
            userId: { id: userId, model: 'Customer', role: role },
            points: pointsToAdd,
            transactionType: 'EARN',
            referenceId: orderId,
            onModel: 'Order',
            description: `Earned ${pointsToAdd} points for completing order #${orderId} of €${orderAmount}`,
          },
        ],
        { session },
      );
    }

    if (!externalSession) await session.commitTransaction();

    return {
      message: 'Order points added successfully',
      pointsEarned: pointsToAdd,
    };
  } catch (error: any) {
    if (!externalSession) await session.abortTransaction();
    try {
      await PointsLog.create({
        userId: { id: userId, model: 'Customer', role: role },
        points: 0,
        transactionType: 'FAILED_LOG',
        referenceId: orderId as any,
        onModel: 'Order',
        description: `FAILED: ${error.message}`,
      });
    } catch (logError) {
      console.error('PointsLog backup logging failed:', logError);
    }

    return { success: false, error: error.message };
  } finally {
    if (!externalSession) session.endSession();
  }
};

/**
 * Adds points to a delivery partner for completing a delivery.
 * Default is 20 points unless specified in Global Settings.
 */
const addDeliveryPartnerPoints = async (
  deliveryPartnerId: Types.ObjectId | string,
  orderId: string,
  externalSession?: ClientSession,
) => {
  const role = 'DELIVERY_PARTNER';
  const session = externalSession || (await mongoose.startSession());

  if (!externalSession) session.startTransaction();

  try {
    // 1. Check if points already exists for this order to prevent double earning
    const alreadyReceived = await PointsLog.findOne({
      'userId.id': deliveryPartnerId,
      referenceId: orderId,
      transactionType: 'EARN',
    }).session(session);

    if (alreadyReceived) {
      // If already granted, we exit silently to avoid crashing the main process
      if (!externalSession) await session.commitTransaction();
      return {
        message: 'Points already granted for this order',
        pointsEarned: 0,
      };
    }

    // 2. Fetch the order and validate
    const existsOrder = await Order.findById(orderId).session(session);

    if (!existsOrder) {
      throw new AppError(
        httpStatus.NOT_FOUND,
        'The specified order was not found.',
      );
    }

    // 3. Security: Ensure the delivery partner is the authorized delivery partner for this order
    if (
      existsOrder.deliveryPartnerId?.toString() !== deliveryPartnerId.toString()
    ) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        'Unauthorized: You are not the assigned delivery partner for this order.',
      );
    }

    // 4. State Validation: Points should only be granted for delivered orders
    if (existsOrder.orderStatus !== 'DELIVERED') {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        `Points cannot be granted. Order status is ${existsOrder.orderStatus}, but it must be DELIVERED.`,
      );
    }

    // 5. Fetch points configuration from settings
    const settings = await GlobalSettingsService.getGlobalSettings(session);
    const rewards = settings?.rewards;

    const expiryDays = rewards?.pointsExpiryDays || 365;
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + expiryDays);

    // Fallback to 20 if settings are missing to avoid NaN errors
    const points = rewards?.riderPointsPerDelivery || 20;

    // 6. Update points balance
    await Points.findOneAndUpdate(
      { 'userId.id': deliveryPartnerId },
      {
        $inc: { currentPoints: points, totalEarned: points },
        $set: { expiryDate },
        $setOnInsert: {
          'userId.id': deliveryPartnerId,
          'userId.model': 'DeliveryPartner',
          'userId.role': role,
        },
      },
      { upsert: true, session, new: true },
    );

    // 7. Create audit log
    await PointsLog.create(
      [
        {
          userId: {
            id: deliveryPartnerId,
            model: 'DeliveryPartner',
            role: role,
          },
          points: points,
          transactionType: 'EARN',
          referenceId: orderId,
          onModel: 'Order',
          description: `Delivery bonus: Received ${points} points for completing order #${orderId}`,
        },
      ],
      { session },
    );

    if (!externalSession) await session.commitTransaction();

    return {
      message: 'Delivery points added successfully',
      pointsEarned: points,
    };
  } catch (error: any) {
    if (!externalSession) await session.abortTransaction();
    // --- Database Logging: Save failure info to PointsLog as FAILED_LOG ---
    try {
      await PointsLog.create({
        userId: { id: deliveryPartnerId, model: 'DeliveryPartner', role: role },
        points: 0,
        transactionType: 'FAILED_LOG',
        referenceId: orderId as any,
        onModel: 'Order',
        description: `FAILED: ${error.message}`,
      });
    } catch (logError) {
      console.error(
        'Critical: Failed to log loyalty error to database:',
        logError,
      );
    }

    // Return failure object instead of throwing, to keep the main flow alive
    return {
      success: false,
      error: error.message,
      pointsEarned: 0,
    };
  } finally {
    if (!externalSession) session.endSession();
  }
};

// Fetch my points
const getMyPoints = async (currentUser: AuthUser) => {
  const points = await Points.findOne({
    'userId.id': currentUser._id,
  }).lean();

  return {
    message: 'Points fetched successfully',
    data: {
      currentPoints: points?.currentPoints || 0,
      totalEarned: points?.totalEarned || 0,
      totalSpent: points?.totalSpent || 0,
    },
  };
};

// Fetch all points
const getAllPoints = async (query: Record<string, unknown>) => {
  const points = new QueryBuilder(
    Points.find({}).populate('userId.id', 'name role email'),
    query,
  );

  if (!points) {
    throw new AppError(httpStatus.NOT_FOUND, 'Points not found');
  }

  const meta = await points.countTotal();
  const data = await points.modelQuery;

  return {
    message: 'Points fetched successfully',
    data,
    meta,
  };
};

const createReferralRecord = async (
  referrerId: Types.ObjectId,
  newUserId: Types.ObjectId,
  session?: ClientSession,
) => {
  const isExist = await Referral.findOne({
    'referredUserId.id': newUserId,
  }).session(session as ClientSession);

  if (isExist) return;

  await Referral.create(
    [
      {
        userId: { id: referrerId, model: 'Customer', role: 'CUSTOMER' },
        referredUserId: { id: newUserId, model: 'Customer', role: 'CUSTOMER' },
        status: 'PENDING',
        rewardLevel: 1,
      },
    ],
    { session },
  );
};

const processReferralReward = async (
  newUserId: string,
  orderAmount: number,
  session: any,
) => {
  const referral = await Referral.findOne({
    'referredUserId.id': newUserId,
    status: 'PENDING',
  }).session(session);

  if (referral) {
    await Customer.updateOne(
      { _id: referral.userId.id },
      { $inc: { loyaltyPoints: 50 } },
      { session },
    );

    referral.status = 'REWARDED';
    referral.orderCompleted = true;
    referral.orderAmount = orderAmount;
    await referral.save({ session });
  }
};

export const LoyaltyServices = {
  addOrderPoints,
  addDeliveryPartnerPoints,
  getMyPoints,
  getAllPoints,
  createReferralRecord,
  processReferralReward,
};
