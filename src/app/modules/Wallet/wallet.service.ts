/* eslint-disable @typescript-eslint/no-explicit-any */
import mongoose from 'mongoose';
import { Wallet } from './wallet.model';
import { AuthUser } from '../../constant/user.constant';
import { QueryBuilder } from '../../builder/QueryBuilder';
import { DeliveryPartner } from '../Delivery-Partner/delivery-partner.model';
import AppError from '../../errors/AppError';
import httpStatus from 'http-status';

// get all wallets
const getAllWallets = async (
  query: Record<string, unknown>,
  currentUser: AuthUser,
) => {
  if (currentUser.role === 'FLEET_MANAGER') {
    const partners = await DeliveryPartner.find({
      'registeredBy.id': new mongoose.Types.ObjectId(currentUser._id),
      'registeredBy.model': 'FleetManager',
    }).select('_id');
    const partnerIds = partners.map((p) => p._id);
    query.userId = { $in: partnerIds };
    query.userModel = 'DeliveryPartner';
  }
  const wallets = new QueryBuilder(
    Wallet.find().populate('userId', 'userId'),
    query,
  )
    .fields()
    .paginate()
    .search([])
    .filter()
    .sort();
  const data = await wallets.modelQuery;
  const meta = await wallets.countTotal();
  return {
    meta,
    data,
  };
};

// get single wallet
const getSingleWallet = async (walletId: string, currentUser: AuthUser) => {
  const wallet = await Wallet.findOne({ walletId }).populate(
    'userId',
    'name email userId',
  );

  if (!wallet) {
    throw new AppError(httpStatus.NOT_FOUND, 'Wallet not found');
  }

  if (currentUser.role === 'FLEET_MANAGER') {
    const isPartner = await DeliveryPartner.findOne({
      _id: wallet.userId,
      'registeredBy.id': new mongoose.Types.ObjectId(currentUser._id),
    });

    if (!isPartner) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        'You do not have permission to view this wallet',
      );
    }
  }

  return wallet;
};

// get my wallet
const getMyWallet = async (currentUser: AuthUser) => {
  const userId = new mongoose.Types.ObjectId(currentUser._id);
  const adminUserId = new mongoose.Types.ObjectId('694a088c43ee1acbe0e9c87d');

  let wallet;

  if (currentUser.role === 'ADMIN' || currentUser.role === 'SUPER_ADMIN') {
    wallet = await Wallet.findOne({
      userId: adminUserId,
    }).populate('userId', 'name email userId');
  } else {
    wallet = await Wallet.findOne({
      userId: userId,
    }).populate('userId', 'name email userId');
  }
  if (!wallet) {
    throw new AppError(httpStatus.NOT_FOUND, 'Wallet not found for this user');
  }

  return wallet;
};

export const WalletServices = {
  getAllWallets,
  getSingleWallet,
  getMyWallet,
};
