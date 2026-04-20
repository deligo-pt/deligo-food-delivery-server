/* eslint-disable @typescript-eslint/no-explicit-any */
import { ROLE_COLLECTION_MAP } from '../../constant/user.constant';
import { GlobalSettingsService } from '../GlobalSetting/globalSetting.service';
import { Order } from '../Order/order.model';
import { Points, PointsLog, Referral, RewardItem } from './loyalty.model';
import mongoose, { Types } from 'mongoose';

/**
 * Adds loyalty points to a customer based on their order amount.
 * Formula: Order Amount * Global Points Per Euro Rate.
 */
const addOrderPoints = async (
  userId: Types.ObjectId,
  role: string,
  orderId: string,
) => {
  const existsOrder = await Order.findById(orderId);

  if (!existsOrder) throw new Error('Order not found');

  const orderAmount = existsOrder.payoutSummary.grandTotal;
  const userModel =
    ROLE_COLLECTION_MAP[role as keyof typeof ROLE_COLLECTION_MAP];
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    // Fetch dynamic point conversion rate from settings
    const settings = await GlobalSettingsService.getGlobalSettings(session);

    if (!settings) throw new Error('Global settings not found');

    const rewards = settings.rewards;

    const pointsToAdd = Math.floor(orderAmount * rewards.customerPointsPerEuro);

    // Update user's point balance (Atomic Increment)
    await Points.findOneAndUpdate(
      { 'userId.id': userId },
      {
        $inc: { currentPoints: pointsToAdd, totalEarned: pointsToAdd },
        $setOnInsert: {
          'userId.model': userModel,
          'userId.role': role,
        },
      },

      { upsert: true, session, new: true },
    );

    // Record the point transaction in history log
    await PointsLog.create(
      [
        {
          userId: { id: userId, model: userModel, role: role },
          points: pointsToAdd,
          transactionType: 'EARN',
          referenceId: orderId,
          onModel: 'Order',
          description: `Earned ${pointsToAdd} points from order €${orderAmount}`,
        },
      ],
      { session },
    );

    await session.commitTransaction();
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

/**
 * Adds points to a rider for completing a delivery.
 * Default is 20 points unless specified in Global Settings.
 */
const addRiderPoints = async (
  riderId: string,
  role: string,
  deliveryId: string,
) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const settings = await GlobalSettingsService.getGlobalSettings();
    const rewards = settings?.rewards;
    const points = rewards?.riderPointsPerDelivery || 20;

    // Update rider's point balance
    await Points.findOneAndUpdate(
      { 'userId.id': riderId },
      { $inc: { currentPoints: points, totalEarned: points } },
      { upsert: true, session },
    );

    // Record the rider's earning log
    await PointsLog.create(
      [
        {
          userId: { id: riderId, model: 'Rider', role: role },
          points: points,
          transactionType: 'EARN',
          referenceId: deliveryId,
          onModel: 'Order',
          description: `Delivery bonus: ${points} points`,
        },
      ],
      { session },
    );

    await session.commitTransaction();
  } catch (error) {
    await session.abortTransaction();
    console.error('Rider Point Error:', error);
    throw error;
  } finally {
    session.endSession();
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
  addRiderPoints,
  processReferralReward,
  redeemRewardItem,
};
