import mongoose from 'mongoose';

export type TWallet = {
  walletId: string;
  userId: mongoose.Types.ObjectId | string;
  userModel: 'Customer' | 'Vendor' | 'FleetManager' | 'DeliveryPartner';
  lastSettlementDate?: Date;
  totalUnpaidEarnings: number;
  totalRiderPayable: number;
  totalFleetEarnings: number;
  totalEarnings: number;
};
