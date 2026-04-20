/* eslint-disable @typescript-eslint/no-explicit-any */
import httpStatus from 'http-status';
import AppError from '../../errors/AppError';
import { GlobalSettingsService } from '../GlobalSetting/globalSetting.service';
import { Order } from '../Order/order.model';
import { Points, PointsLog, Referral, RewardItem } from './loyalty.model';
import mongoose, { ClientSession, Types } from 'mongoose';

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

    if (pointsToAdd > 0) {
      // 6. Update user's point balance (Atomic Increment)
      await Points.findOneAndUpdate(
        { 'userId.id': userId },
        {
          $inc: { currentPoints: pointsToAdd, totalEarned: pointsToAdd },
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

    // Fallback to 20 if settings are missing to avoid NaN errors
    const points = rewards?.riderPointsPerDelivery || 20;

    // 6. Update points balance
    await Points.findOneAndUpdate(
      { 'userId.id': deliveryPartnerId },
      {
        $inc: { currentPoints: points, totalEarned: points },
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

/**
 * Checks and grants referral rewards to the referrer
 * when they reach specific successful referral milestones.
 */
const processReferralReward = async (referrerId: string, role: string) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const settings = await GlobalSettingsService.getGlobalSettings();

    if (!settings) throw new Error('Global settings not found');

    const rewards = settings.rewards;

    // Count how many people joined using this ID and completed their task
    const qualifiedCount = await Referral.countDocuments({
      'userId.id': referrerId,
      status: 'QUALIFIED',
    }).session(session);

    // Check if the current count matches any milestone in Global Settings
    const milestone = rewards.customerReferralMilestones.find(
      (m) => m.friendsRequired === qualifiedCount,
    );

    if (milestone) {
      if (
        milestone.rewardType === 'CREDIT' ||
        milestone.rewardType === 'CASHBACK'
      ) {
        const pointsToAdd =
          milestone.rewardValue * rewards.customerPointsPerEuro;

        // Reward the referrer with points equivalent to the cash value
        await Points.findOneAndUpdate(
          { 'userId.id': referrerId },
          { $inc: { currentPoints: pointsToAdd, totalEarned: pointsToAdd } },
          { upsert: true, session },
        );

        await PointsLog.create(
          [
            {
              userId: { id: referrerId, model: 'Customer', role: role },
              points: pointsToAdd,
              transactionType: 'REFERRAL_BONUS',
              onModel: 'Referral',
              description: `Reward for reaching Milestone: ${qualifiedCount} successful referrals`,
            },
          ],
          { session },
        );
      }

      // Mark the current set of qualified referrals as 'REWARDED'
      // to avoid duplicate reward processing for the same milestone.
      await Referral.updateMany(
        { 'userId.id': referrerId, status: 'QUALIFIED' },
        { $set: { status: 'REWARDED' } },
        { session },
      );
    }

    await session.commitTransaction();
  } catch (error) {
    await session.abortTransaction();
    console.error('Referral Reward Processing Error:', error);
    throw error;
  } finally {
    session.endSession();
  }
};

/**
 * Handles redemption of loyalty points for physical/digital reward items.
 */
const redeemRewardItem = async (
  userId: string,
  role: string,
  itemId: string,
) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1. Validation: Item availability and stock
    const item = await RewardItem.findById(itemId).session(session);
    if (!item || item.stock <= 0) {
      throw new Error('Item unavailable or out of stock');
    }

    // 2. Validation: Ensure user has sufficient balance
    const userPoints = await Points.findOne({ 'userId.id': userId }).session(
      session,
    );
    if (!userPoints || userPoints.currentPoints < item.requiredPoints) {
      throw new Error('Insufficient points to redeem this item');
    }

    // 3. Deduct points from user's current balance
    await Points.findOneAndUpdate(
      { 'userId.id': userId },
      {
        $inc: {
          currentPoints: -item.requiredPoints,
          totalSpent: item.requiredPoints,
        },
      },
      { session },
    );

    // 4. Reduce stock count for the redeemed item
    await RewardItem.findByIdAndUpdate(
      itemId,
      { $inc: { stock: -1 } },
      { session },
    );

    // 5. Create a redemption log
    await PointsLog.create(
      [
        {
          userId: { id: userId, model: 'Customer', role: role },
          points: -item.requiredPoints,
          transactionType: 'REDEEM',
          referenceId: item._id,
          onModel: 'RewardClaim',
          description: `Redeemed: ${item.name}`,
        },
      ],
      { session },
    );

    await session.commitTransaction();
    return { success: true, message: `Successfully redeemed ${item.name}` };
  } catch (error: any) {
    await session.abortTransaction();
    throw new Error(error.message || 'Redemption failed');
  } finally {
    session.endSession();
  }
};

export const LoyaltyServices = {
  addOrderPoints,
  addDeliveryPartnerPoints,
  processReferralReward,
  redeemRewardItem,
};
