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

// initiate payout service
const initiateSettlement = async (
  targetUserId: string,
  currentUser: AuthUser,
) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  const { _id: senderId } = currentUser;
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

    const [payout] = await Payout.create(
      [
        {
          payoutId: `PAY-${Date.now()}`,
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
    return payout;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
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
    const payout = await Payout.findById(payoutId).session(session);

    if (!payout || payout.status !== 'PROCESSING') {
      throw new AppError(httpStatus.BAD_REQUEST, 'Invalid payout session.');
    }

    const user = await mongoose
      .model(payout.userModel)
      .findById(payout.userId)
      .session(session);

    if (!user || !user.bankDetails || !user.bankDetails.iban) {
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

    const walletUpdate: any = {
      $inc: { totalUnpaidEarnings: -amountToDeduct },
    };

    if (
      payout.userModel === 'DeliveryPartner' &&
      payout.senderModel === 'FleetManager'
    ) {
      walletUpdate.$inc.totalRiderPayable = -amountToDeduct;
    }

    await Wallet.findOneAndUpdate(
      { userId: payout.userId, userModel: payout.userModel },
      walletUpdate,
      { session },
    );

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
      iban: user?.bankDetails?.iban,
      swiftCode: user?.bankDetails?.swiftCode,
    };
    const result = await payout.save({ session });

    await session.commitTransaction();
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
  if (currentUser.role !== 'ADMIN' && currentUser.role !== 'SUPER_ADMIN') {
    if (currentUser.role === 'FLEET_MANAGER') {
      query.userId = query.userId || currentUser._id;
    } else {
      query.userId = currentUser._id;
    }
  }

  if (!query.status) {
    query.status = { $in: ['PAID', 'PROCESSING', 'FAILED'] };
  }

  const payoutQuery = new QueryBuilder(
    Payout.find()
      .populate('userId', 'name profilePhoto userId')
      .populate('senderId', 'name role'),
    query,
  )
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await payoutQuery.modelQuery;
  const meta = await payoutQuery.countTotal();

  return {
    meta,
    result,
  };
};

export const PayoutServices = {
  initiateSettlement,
  finalizeSettlement,
  getAllPayouts,
};
