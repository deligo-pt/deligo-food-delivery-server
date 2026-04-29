/* eslint-disable @typescript-eslint/no-explicit-any */
import AppError from '../../errors/AppError';
import httpStatus from 'http-status';
import mongoose from 'mongoose';
import { Payout } from './payout.model';
import { AuthUser, ROLE_COLLECTION_MAP } from '../../constant/user.constant';
import { findUserById } from '../../utils/findUserByEmailOrId';
import { QueryBuilder } from '../../builder/QueryBuilder';
import { Wallet } from '../Wallet/wallet.model';
import { Transaction } from '../Transaction/transaction.model';
import { NotificationService } from '../Notification/notification.service';
import customNanoId from '../../utils/customNanoId';
import { Admin } from '../Admin/admin.model';
import { GlobalSettings } from '../GlobalSetting/globalSetting.model';

// initiate payout service
const initiateSettlement = async (
  targetUserId: string,
  currentUser: AuthUser,
) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  const { _id: senderId, role: senderRole } = currentUser;
  const senderModel =
    ROLE_COLLECTION_MAP[currentUser.role as keyof typeof ROLE_COLLECTION_MAP];

  const { user } = await findUserById({ userId: targetUserId });

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'Target user not found');
  }
  const userId = user?._id;
  const targetUserModel =
    ROLE_COLLECTION_MAP[user?.role as keyof typeof ROLE_COLLECTION_MAP];

  try {
    if (senderRole === 'FLEET_MANAGER') {
      if (user?.role !== 'DELIVERY_PARTNER') {
        throw new AppError(
          httpStatus.FORBIDDEN,
          'Fleet Managers can only settle with Delivery Partners.',
        );
      }
      const isHisRider =
        user.registeredBy &&
        user.registeredBy.id.toString() === senderId.toString();

      if (!isHisRider) {
        throw new AppError(
          httpStatus.FORBIDDEN,
          'You can only initiate settlement for your own delivery partners.',
        );
      }
    }
    const wallet = await Wallet.findOne({
      userId,
      userModel: targetUserModel,
    }).session(session);

    if (!wallet || wallet.totalUnpaidEarnings <= 0) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'No unpaid earnings to settle.',
      );
    }

    const snapshotAmount = wallet.totalUnpaidEarnings;
    const uniquePayoutId = customNanoId(8);

    const [payout] = await Payout.create(
      [
        {
          payoutId: `PAY-${uniquePayoutId}`,
          userId,
          userModel: targetUserModel,
          senderId: senderId,
          senderModel: senderModel,
          amount: snapshotAmount,
          status: 'PROCESSING',
          paymentMethod: 'BANK_TRANSFER',
        },
      ],
      { session },
    );

    await session.commitTransaction();

    if (payout) {
      const NotificationPayload = {
        title: 'Payout initiated',
        message: 'Payout initiated successfully',
        data: {
          amount: String(payout.amount),
          status: String(payout.status),
          paymentMethod: String(payout.paymentMethod),
        },
      };

      NotificationService.sendToUser(
        user.userId,
        NotificationPayload.title,
        NotificationPayload.message,
        NotificationPayload.data,
        'default',
        'PAYOUT',
      );
    }

    return payout;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

// reject payout service
const rejectPayout = async (
  payoutId: string,
  reason: string,
  currentUser: AuthUser,
) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const payout = await Payout.findOne({ payoutId })
      .populate('userId', 'userId')
      .session(session);

    if (!payout) {
      throw new AppError(httpStatus.NOT_FOUND, 'Payout record not found.');
    }

    if (payout.senderId.toString() !== currentUser._id.toString()) {
      throw new AppError(httpStatus.FORBIDDEN, 'Unauthorized action.');
    }

    if (payout.status !== 'PROCESSING') {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        `Cannot reject a payout that is already ${payout.status}.`,
      );
    }

    payout.status = 'FAILED';
    payout.remarks = reason || 'Terminated due to incorrect bank details.';
    payout.failedAt = new Date();
    payout.failedReason = reason || 'Terminated due to incorrect bank details.';

    await payout.save({ session });

    await session.commitTransaction();

    const NotificationPayload = {
      title: 'Payout rejected',
      message: `Payout has been rejected. Reason: ${reason}`,
      data: {
        amount: String(payout.amount),
        status: String(payout.status),
        paymentMethod: String(payout.paymentMethod),
      },
    };
    NotificationService.sendToUser(
      (payout.userId as any).userId,
      NotificationPayload.title,
      NotificationPayload.message,
      NotificationPayload.data,
      'default',
      'PAYOUT',
    );

    return {
      success: true,
      message:
        'Payout has been marked as FAILED. No balance was deducted from the wallet.',
      data: payout,
    };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

// retry failed payout service
const retryFailedPayout = async (payoutId: string, currentUser: AuthUser) => {
  const payout = await Payout.findOne({ payoutId }).populate(
    'userId',
    'userId bankDetails',
  );

  if (!payout || payout.status !== 'FAILED') {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Only failed payouts can be retried.',
    );
  }

  if (payout.senderId.toString() !== currentUser._id.toString()) {
    throw new AppError(httpStatus.FORBIDDEN, 'Unauthorized action.');
  }

  const user = payout.userId as any;

  if (
    !user?.bankDetails?.iban ||
    !user?.bankDetails?.swiftCode ||
    !user?.bankDetails?.bankName ||
    !user?.bankDetails?.accountHolderName ||
    !user?.bankDetails?.accountNumber
  ) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Update bank details before retrying.',
    );
  }

  payout.status = 'PROCESSING';
  payout.remarks = `Retried by ${currentUser.role} on ${new Date().toLocaleDateString()}`;
  payout.retryAt = new Date();
  payout.retryRemarks = `Retried by ${currentUser.role} on ${new Date().toLocaleDateString()}`;

  const NotificationPayload = {
    title: 'Payout retried',
    message: 'Your payout has been retried. Now your payout is in processing.',
    data: {
      amount: String(payout.amount),
      status: String(payout.status),
      paymentMethod: String(payout.paymentMethod),
    },
  };
  NotificationService.sendToUser(
    user.userId,
    NotificationPayload.title,
    NotificationPayload.message,
    NotificationPayload.data,
    'default',
    'PAYOUT',
  );

  await payout.save();
  return {
    message: 'Payout is now in processing again. You can now finalize it.',
  };
};

// finalize payout service
const finalizeSettlement = async (
  payoutId: string,
  payload: {
    bankReferenceId: string;
    remarks?: string;
  },
  payoutProof: string | null,
  currentUser: AuthUser,
) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  const processedBy = new mongoose.Types.ObjectId(currentUser._id);
  const processorModel =
    ROLE_COLLECTION_MAP[currentUser.role as keyof typeof ROLE_COLLECTION_MAP];

  try {
    const payout = await Payout.findOne({ payoutId })
      .populate('userId', 'userId bankDetails')
      .session(session);

    if (!payout || payout.status !== 'PROCESSING') {
      throw new AppError(httpStatus.BAD_REQUEST, 'Invalid payout session.');
    }

    const user = payout.userId as any;

    if (
      !user ||
      !user.bankDetails ||
      !user.bankDetails.iban ||
      !user.bankDetails.accountNumber
    ) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'User bank details not found.',
      );
    }

    if (!payoutProof) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'Payout proof image is mandatory.',
      );
    }

    const settlementTypeMapper: Record<string, string> = {
      Vendor: 'VENDOR_SETTLEMENT',
      DeliveryPartner: 'DELIVERY_PARTNER_SETTLEMENT',
      FleetManager: 'FLEET_SETTLEMENT',
    };

    const amountToDeduct = payout.amount;

    await Wallet.findOneAndUpdate(
      { userId: payout.userId, userModel: payout.userModel },
      {
        $inc: { totalUnpaidEarnings: -amountToDeduct },
        $set: { lastSettlementDate: new Date() },
      },
      { session },
    );

    if (
      payout.userModel === 'DeliveryPartner' &&
      payout.senderModel === 'FleetManager'
    ) {
      await Wallet.findOneAndUpdate(
        { userId: payout.senderId, userModel: 'FleetManager' },
        { $inc: { totalRiderPayable: -amountToDeduct } },
        { session },
      );
    }

    await Transaction.create(
      [
        {
          transactionId: `TXN-SETTLE-${Date.now()}`,
          payoutId: payout._id,
          userId: payout.userId,
          userModel: payout.userModel,
          totalAmount: amountToDeduct,
          type: settlementTypeMapper[payout.userModel],
          status: 'SUCCESS',
          paymentMethod: payout.paymentMethod,
          remarks: payload.remarks || 'Weekly settlement completed',
          processedBy: new mongoose.Types.ObjectId(processedBy),
          processorModel: processorModel,
        },
      ],
      { session },
    );

    payout.status = 'PAID';
    payout.bankReferenceId = payload.bankReferenceId;
    payout.remarks = payload.remarks || 'Weekly settlement completed';
    payout.payoutProof = payoutProof;
    payout.bankDetails = {
      bankName: user?.bankDetails?.bankName,
      accountHolderName: user?.bankDetails?.accountHolderName,
      accountNumber: user?.bankDetails?.accountNumber,
      iban: user?.bankDetails?.iban,
      swiftCode: user?.bankDetails?.swiftCode,
    };
    const result = await payout.save({ session });

    await session.commitTransaction();

    const NotificationPayload = {
      title: 'Settlement completed',
      message: `Your settlement of ${amountToDeduct} has been processed successfully.`,
      data: {
        amount: String(result.amount),
        status: String(result.status),
        paymentMethod: String(result.paymentMethod),
      },
    };
    NotificationService.sendToUser(
      (result.userId as any).userId,
      NotificationPayload.title,
      NotificationPayload.message,
      NotificationPayload.data,
      'default',
      'PAYOUT',
    );

    return { message: 'Settlement completed successfully.', data: result };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

// get all payouts
const getAllPayouts = async (
  query: Record<string, unknown>,
  currentUser: AuthUser,
) => {
  const { role, _id: currentUserId } = currentUser;
  const { startDate, endDate, ...remainingQuery } = query;
  const filter: Record<string, any> = { ...remainingQuery };

  if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
    if (role === 'FLEET_MANAGER') {
      filter.$or = [{ senderId: currentUserId }, { userId: currentUserId }];

      if (query.userId) {
        filter.userId = query.userId;
      }
    } else {
      filter.userId = currentUserId;
    }
  }

  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) {
      const start = new Date(startDate as string);
      start.setHours(0, 0, 0, 0);
      filter.createdAt.$gte = start;
    }
    if (endDate) {
      const end = new Date(endDate as string);
      end.setHours(23, 59, 59, 999);
      filter.createdAt.$lte = end;
    }
  }

  const payoutQuery = new QueryBuilder(
    Payout.find()
      .populate('userId', 'name profilePhoto userId role')
      .populate('senderId', 'name role'),
    filter,
  )
    .filter()
    .sort()
    .paginate()
    .fields()
    .search([]);

  const rawResult = await payoutQuery.modelQuery;
  const meta = await payoutQuery.countTotal();

  const result = rawResult.map((payout: any) => {
    let payoutCategory = 'GENERAL';

    if (role === 'FLEET_MANAGER') {
      if (payout.userId?._id?.toString() === currentUserId.toString()) {
        payoutCategory = 'RECEIVED_FROM_ADMIN';
      } else if (
        payout.senderId?._id?.toString() === currentUserId.toString()
      ) {
        payoutCategory = 'PAID_TO_PARTNER';
      }
    }
    return {
      ...payout.toObject(),
      payoutCategory,
    };
  });

  return {
    meta,
    result,
  };
};

// get single payout service
const getSinglePayout = async (payoutId: string, currentUser: AuthUser) => {
  const { role, _id: currentUserId } = currentUser;

  const payout = await Payout.findOne({ payoutId })
    .populate('userId', 'name profilePhoto userId email phone bankDetails')
    .populate('senderId', 'name role profilePhoto');

  if (!payout) {
    throw new AppError(httpStatus.NOT_FOUND, 'Payout record not found.');
  }

  if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
    const isOwner = payout.userId._id.toString() === currentUserId.toString();
    const isSender =
      payout.senderId._id.toString() === currentUserId.toString();

    if (!isOwner && !isSender) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        'You do not have permission to view this payout detail.',
      );
    }
  }

  let payoutCategory = 'GENERAL';
  if (role === 'FLEET_MANAGER') {
    if (payout.userId._id.toString() === currentUserId.toString()) {
      payoutCategory = 'RECEIVED_FROM_ADMIN';
    } else if (payout.senderId._id.toString() === currentUserId.toString()) {
      payoutCategory = 'PAID_TO_PARTNER';
    }
  }

  return {
    ...payout.toObject(),
    payoutCategory,
  };
};

const initiateAutomatedSettlement = async () => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const settings = await GlobalSettings.findOne().lean();
    if (!settings) throw new Error('Global settings not found');

    const { minPayoutAmount, payoutWindowDays } = settings.payout;
    const endDate = new Date();
    endDate.setDate(endDate.getDate() - (payoutWindowDays || 0));

    const eligibleWallets = await Wallet.find({
      totalUnpaidEarnings: { $gte: minPayoutAmount },
      userModel: { $in: ['Vendor', 'FleetManager', 'DeliveryPartner'] },
    })
      .populate('userId')
      .session(session);

    if (eligibleWallets.length === 0) return;

    const superAdmin = await Admin.findOne({ role: 'SUPER_ADMIN' });

    for (const wallet of eligibleWallets) {
      const user = wallet.userId as any;

      if (wallet.userModel === 'DeliveryPartner') {
        if (user?.registeredBy?.role === 'FLEET_MANAGER') {
          continue;
        }
      }

      const existingPendingPayout = await Payout.findOne({
        userId: wallet.userId,
        status: 'PENDING',
      }).session(session);

      if (existingPendingPayout) {
        continue;
      }

      const uniquePayoutId = customNanoId(8);

      await Payout.create(
        [
          {
            payoutId: `PAY-${uniquePayoutId}`,
            userId: wallet.userId,
            userModel: wallet.userModel,
            senderId: superAdmin?._id,
            senderModel: 'Admin',
            amount: wallet.totalUnpaidEarnings,
            status: 'PENDING',
            paymentMethod: 'BANK_TRANSFER',

            startDate: wallet.lastSettlementDate || wallet.createdAt,
            endDate: endDate,
          },
        ],
        { session },
      );
    }

    await session.commitTransaction();
  } catch (error) {
    await session.abortTransaction();
    console.error('Automated payout error:', error);
  } finally {
    session.endSession();
  }
};

export const PayoutServices = {
  initiateSettlement,
  rejectPayout,
  retryFailedPayout,
  finalizeSettlement,
  getAllPayouts,
  getSinglePayout,
  initiateAutomatedSettlement,
};
