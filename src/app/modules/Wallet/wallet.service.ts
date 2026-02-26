/* eslint-disable @typescript-eslint/no-explicit-any */
import mongoose from 'mongoose';
import { Wallet } from './wallet.model';
import { AuthUser } from '../../constant/user.constant';
import { QueryBuilder } from '../../builder/QueryBuilder';
import { DeliveryPartner } from '../Delivery-Partner/delivery-partner.model';

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

export const WalletServices = {
  getAllWallets,
};
