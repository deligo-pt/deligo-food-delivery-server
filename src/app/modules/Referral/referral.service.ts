/* eslint-disable @typescript-eslint/no-explicit-any */
import mongoose, { ClientSession, Types } from 'mongoose';
import {
  ROLE_COLLECTION_MAP,
  USER_ROLE,
} from '../../constant/GlobalConstant/user.constant';
import { Customer } from '../Customer/customer.model';
import { DeliveryPartner } from '../Delivery-Partner/delivery-partner.model';
import { Vendor } from '../Vendor/vendor.model';
import { TReferral } from './referral.interface';
import { Referral } from './referral.model';
import { Transaction } from '../Transaction/transaction.model';
import AppError from '../../errors/AppError';
import httpStatus from 'http-status';
import { GlobalSettings } from '../GlobalSetting/globalSetting.model';
import { Coupon } from '../Coupon/coupon.model';
import { Order } from '../Order/order.model';
import { generateTransactionId } from '../../utils/generateTransactionId';
import { DeliGoBalance } from '../DeliGo_Balance/deliGoBalance.model';
import { TCurrentUser } from '../../constant/GlobalInterface/user.interface';

const createReferralEntry = async (
  newUser: { _id: Types.ObjectId | string; role: string },
  referralCode: string,
) => {
  if (!referralCode) return null;

  const roleMap: Record<string, { model: any; name: any }> = {
    [USER_ROLE.CUSTOMER]: { model: Customer, name: 'Customer' },
    [USER_ROLE.VENDOR]: { model: Vendor, name: 'Vendor' },
    [USER_ROLE.DELIVERY_PARTNER]: {
      model: DeliveryPartner,
      name: 'DeliveryPartner',
    },
  };

  const target = roleMap[newUser.role];
  if (!target) throw new AppError(httpStatus.BAD_REQUEST, 'Invalid user role');

  const referrer = await target.model.findOne({ referralCode }).lean();

  const modelName = target.name;

  if (!referrer) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      'Please enter a valid referral code.',
    );
  }

  const referredUserId = new Types.ObjectId(newUser._id as string);
  const referrerUserId = new Types.ObjectId(referrer._id as string);

  if (referrer) {
    const referralData: Partial<TReferral> = {
      referrerId: referrerUserId,
      referredId: referredUserId,
      referrerModel: modelName,
      referredModel: modelName,
      status: 'PENDING',
      isRewardDistributed: false,
    };

    const result = await Referral.create(referralData);

    const settings = await GlobalSettings.findOne().lean();
    const riderWelcomeBonus = settings?.rewards?.newRiderWelcomeBonus || 0;

    if (newUser.role === USER_ROLE.DELIVERY_PARTNER) {
      await DeliGoBalance.findOneAndUpdate(
        { userObjectId: newUser._id, userModel: 'DeliveryPartner' },
        {
          $inc: {
            totalBalance: riderWelcomeBonus,
            totalEarned: riderWelcomeBonus,
          },
        },
        { upsert: true },
      );
    }
    return result;
  }

  return null;
};

const distributeReferralBonus = async (
  referredId: string,
  orderId?: string,
  externalSession?: ClientSession,
) => {
  const session = externalSession || (await mongoose.startSession());
  if (!externalSession) session.startTransaction();
  try {
    const referral = await Referral.findOne({
      referredId: new Types.ObjectId(referredId),
      status: 'PENDING',
      isRewardDistributed: false,
    }).session(session);

    if (!referral) {
      if (!externalSession) await session.abortTransaction();
      return {
        success: false,
        message: 'Referral already processed or not found',
      };
    }

    const settings = await GlobalSettings.findOne().session(session);
    const milestones = settings?.rewards.customerReferralMilestones || [];

    const totalSuccessfulInvites =
      (await Referral.countDocuments({
        referrerId: referral.referrerId,
        status: 'COMPLETED',
      }).session(session)) + 1;

    const milestone = milestones.find(
      (m) => m.friendsRequired === totalSuccessfulInvites,
    );

    if (orderId && milestone) {
      const order = await Order.findById(orderId).session(session);
      if (!order) throw new Error('Order data missing');

      if (order.payoutSummary.grandTotal < milestone.minOrderAmountPerFriend) {
        console.log(
          `Condition failed: €${order.payoutSummary.grandTotal} < €${milestone.minOrderAmountPerFriend}`,
        );

        referral.status = 'COMPLETED';
        referral.isRewardDistributed = false;
        referral.remarks = 'Milestone reached but min order amount not met';
        await referral.save({ session });

        if (!externalSession) await session.commitTransaction();
        return { success: false, message: 'Min order amount not met' };
      }
    }

    referral.status = 'COMPLETED';
    referral.isRewardDistributed = !!milestone;
    referral.distributedAt = new Date();
    if (orderId) referral.referenceOrderId = new Types.ObjectId(orderId);
    await referral.save({ session });

    if (milestone) {
      const { rewardType, rewardValue, validityDays } = milestone;
      const expiryDate = new Date();
      if (validityDays) expiryDate.setDate(expiryDate.getDate() + validityDays);

      if (rewardType === 'CASHBACK' || rewardType === 'CREDIT') {
        await DeliGoBalance.findOneAndUpdate(
          {
            userObjectId: referral.referrerId,
            userModel: referral.referrerModel,
          },
          { $inc: { totalBalance: rewardValue, totalEarned: rewardValue } },
          { upsert: true, session },
        );

        await Transaction.create(
          [
            {
              transactionId: generateTransactionId(),
              userObjectId: referral.referrerId,
              userModel: referral.referrerModel,
              totalAmount: rewardValue,
              type: 'REFERRAL_BONUS',
              status: 'SUCCESS',
              paymentMethod: 'WALLET',
              remarks: `Unlocked Level ${totalSuccessfulInvites}: Received €${rewardValue} Credit`,
            },
          ],
          { session },
        );
      } else if (rewardType === 'FREE_MEAL' || rewardType === 'FREE_DELIVERY') {
        const couponCode = `${rewardType}-${Math.random().toString(36).substring(7).toUpperCase()}`;

        await Coupon.create(
          [
            {
              userObjectId: referral.referrerId,
              userModel: referral.referrerModel,
              code: couponCode,
              type: rewardType,
              expiryDate: validityDays ? expiryDate : null,
              remarks: `Earned from ${totalSuccessfulInvites}th referral milestone`,
            },
          ],
          { session },
        );
      }
    }

    if (!externalSession) await session.commitTransaction();
    return { success: true, count: totalSuccessfulInvites };
  } catch (error) {
    if (!externalSession) await session.abortTransaction();
    console.error('Referral distribution error:', error);
    throw error;
  } finally {
    if (!externalSession) session.endSession();
  }
};

const getReferralStats = async (currentUser: TCurrentUser) => {
  const userModel =
    ROLE_COLLECTION_MAP[currentUser.role as keyof typeof ROLE_COLLECTION_MAP];
  const [referrals, settings, userBalance, userData] = await Promise.all([
    Referral.find({ referrerId: currentUser._id })
      .populate('referredId', 'name profilePhoto email')
      .sort({ createdAt: -1 })
      .lean(),
    GlobalSettings.findOne()
      .select('rewards.customerReferralMilestones')
      .lean(),
    DeliGoBalance.findOne({
      userObjectId: currentUser._id,
      userModel: userModel,
    }).lean(),
    mongoose
      .model(userModel)
      .findById(currentUser._id)
      .select('referralCode')
      .lean(),
  ]);

  const milestones = settings?.rewards?.customerReferralMilestones || [];

  const successfulInvites = referrals.filter(
    (ref) => ref.status === 'COMPLETED',
  ).length;

  const pendingInvites = referrals.filter(
    (ref) => ref.status === 'PENDING',
  ).length;

  const nextMilestone = milestones.find(
    (m: any) => m.friendsRequired > successfulInvites,
  );

  return {
    myReferralCode: (userData as any)?.referralCode || 'N/A',
    summary: {
      totalInvites: referrals.length,
      successfulInvites,
      pendingInvites,
      totalEarned: userBalance?.totalEarned || 0,
      currentWalletBalance: userBalance?.totalBalance || 0,
      friendsRemainingForNextMilestone: nextMilestone
        ? nextMilestone.friendsRequired - successfulInvites
        : 0,
    },
    milestones: milestones.map((m: any) => ({
      friendsRequired: m.friendsRequired,
      rewardType: m.rewardType,
      rewardValue: m.rewardValue,
      isCompleted: successfulInvites >= m.friendsRequired,
      isNext: nextMilestone
        ? m.friendsRequired === nextMilestone.friendsRequired
        : false,
    })),
    referralHistory: referrals.map((ref: any) => ({
      id: ref._id,
      friendName:
        ref.referredId?.name?.firstName +
          ' ' +
          ref.referredId?.name?.lastName || 'DeliGo User',
      friendPhoto: ref.referredId?.profilePhoto,
      status: ref.status,
      date: ref.createdAt,
    })),
  };
};

export const ReferralServices = {
  createReferralEntry,
  distributeReferralBonus,
  getReferralStats,
};
