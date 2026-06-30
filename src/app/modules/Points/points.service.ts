/* eslint-disable @typescript-eslint/no-explicit-any */
import httpStatus from 'http-status';
import AppError from '../../errors/AppError';
import { GlobalSettingsService } from '../GlobalSetting/globalSetting.service';
import { Order } from '../Order/order.model';
import { Points, PointsLog } from './points.model';
import mongoose, { ClientSession, Types } from 'mongoose';
import { TCurrentUser } from '../../constant/GlobalInterface/user.interface';
import { QueryBuilder } from '../../builder/QueryBuilder';
import { TMessageKey } from '../../errors/messages';

/**
 * Adds loyalty points to a customer based on their order amount.
 * Formula: Order Amount * Global Points Per Euro Rate.
 */
const addOrderPoints = async (
  userObjectId: Types.ObjectId | string,
  orderId: string,
  externalSession?: ClientSession,
) => {
  const role = 'CUSTOMER';
  const session = externalSession || (await mongoose.startSession());

  if (!externalSession) session.startTransaction();

  try {
    // 1. Check if points were already granted for this specific order
    const alreadyReceived = await PointsLog.findOne({
      'userId.id': userObjectId,
      referenceId: orderId,
      transactionType: 'EARN',
    }).session(session);

    if (alreadyReceived) {
      // Exit silently if already granted to prevent double points
      if (!externalSession) await session.commitTransaction();
      return {
        messageKey: 'POINTS_ALREADY_GRANTED_FOR_ORDER' as TMessageKey,
        pointsEarned: 0,
      };
    }

    // 2. Fetch order and validate existence
    const existsOrder = await Order.findById(orderId).session(session);

    if (!existsOrder) {
      throw new AppError(httpStatus.NOT_FOUND, 'ORDER_NOT_FOUND');
    }
    // 3. Security: Ensure the points are being added for the correct customer
    if (existsOrder.customerId?.toString() !== userObjectId.toString()) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        'UNAUTHORIZED_ORDER_NOT_BELONG_TO_USER',
      );
    }

    // 4. Status Check: Only grant points if the order is actually DELIVERED
    if (existsOrder.orderStatus !== 'DELIVERED') {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'POINTS_ONLY_FOR_DELIVERED_ORDER',
        { status: existsOrder.orderStatus },
      );
    }

    // 5. Calculate points based on settings
    const orderAmount = existsOrder.payoutSummary.grandTotal;
    const settings = await GlobalSettingsService.getGlobalSettings(session);

    if (!settings) {
      throw new AppError(
        httpStatus.INTERNAL_SERVER_ERROR,
        'GLOBAL_SETTINGS_NOT_RETRIEVED',
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
      await updatePointBalance(
        userObjectId,
        'Customer',
        'CUSTOMER',
        pointsToAdd,
        'EARN',
        orderId,
        'Order',
        `Earned ${pointsToAdd} points for order €${orderAmount}`,
        session,
        settings?.rewards?.pointsExpiryDays,
      );
    }

    if (!externalSession) await session.commitTransaction();

    return {
      messageKey: 'ORDER_POINTS_ADDED_SUCCESS' as TMessageKey,
      pointsEarned: pointsToAdd,
    };
  } catch (error: any) {
    if (!externalSession) await session.abortTransaction();
    try {
      await PointsLog.create({
        userId: { id: userObjectId, model: 'Customer', role: role },
        points: 0,
        transactionType: 'FAILED_LOG',
        referenceId: orderId as any,
        onModel: 'Order',
        description: `FAILED: ${error.message}`,
      });
    } catch (logError) {
      void logError;
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
        messageKey: 'POINTS_ALREADY_GRANTED_FOR_ORDER' as TMessageKey,
        pointsEarned: 0,
      };
    }

    // 2. Fetch the order and validate
    const existsOrder = await Order.findById(orderId).session(session);

    if (!existsOrder) {
      throw new AppError(httpStatus.NOT_FOUND, 'ORDER_NOT_FOUND_SPECIFIED');
    }

    // 3. Security: Ensure the delivery partner is the authorized delivery partner for this order
    if (
      existsOrder.deliveryPartnerId?.toString() !== deliveryPartnerId.toString()
    ) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        'UNAUTHORIZED_NOT_ASSIGNED_DELIVERY_PARTNER',
      );
    }

    // 4. State Validation: Points should only be granted for delivered orders
    if (existsOrder.orderStatus !== 'DELIVERED') {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'POINTS_CANNOT_BE_GRANTED_ORDER_STATUS',
        { status: existsOrder.orderStatus },
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
      messageKey: 'DELIVERY_POINTS_ADDED_SUCCESS' as TMessageKey,
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
      void logError;
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

const updatePointBalance = async (
  userId: Types.ObjectId | string,
  model: 'Customer' | 'DeliveryPartner' | 'Vendor',
  role: string,
  points: number,
  type: 'EARN' | 'REFERRAL_BONUS' | 'REDEEM' | 'ADJUSTMENT',
  refId: string,
  refModel: 'Order' | 'Referral' | 'RewardClaim',
  desc: string,
  session: ClientSession,
  expiryDays: number = 365,
) => {
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + expiryDays);

  const pointsToUpdate =
    type === 'REDEEM' ? -Math.abs(points) : Math.abs(points);

  const updateQuery: any = {
    'userId.id': userId,
    'userId.model': model,
  };

  if (type === 'REDEEM') {
    updateQuery.currentPoints = { $gte: Math.abs(points) };
  }

  const updatedPoints = await Points.findOneAndUpdate(
    updateQuery,
    {
      $inc: {
        currentPoints: pointsToUpdate,
        totalEarned: type !== 'REDEEM' ? Math.abs(points) : 0,
        totalSpent: type === 'REDEEM' ? Math.abs(points) : 0,
      },
      $set: { expiryDate },
      $setOnInsert: {
        'userId.id': userId,
        'userId.model': model,
        'userId.role': role,
      },
    },
    {
      upsert: type !== 'REDEEM',
      session,
      new: true,
    },
  );

  if (!updatedPoints && type === 'REDEEM') {
    throw new AppError(httpStatus.BAD_REQUEST, 'INSUFFICIENT_POINTS_BALANCE');
  }

  await PointsLog.create(
    [
      {
        userId: { id: userId, model, role },
        points: pointsToUpdate,
        transactionType: type,
        referenceId: refId,
        onModel: refModel,
        description: desc,
      },
    ],
    { session },
  );

  return updatedPoints;
};

// Fetch my points
const getMyPoints = async (currentUser: TCurrentUser) => {
  const points = await Points.findOne({
    'userId.id': currentUser._id,
  }).lean();

  return {
    messageKey: 'POINTS_FETCHED_SUCCESS' as TMessageKey,
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
    messageKey: 'POINTS_FETCHED_SUCCESS' as TMessageKey,
    data,
    meta,
  };
};

export const PointsServices = {
  addOrderPoints,
  addDeliveryPartnerPoints,
  getMyPoints,
  getAllPoints,
};
