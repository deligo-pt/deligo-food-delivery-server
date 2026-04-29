import mongoose from 'mongoose';

export type TWallet = {
  walletId: string;
  userId: mongoose.Types.ObjectId | string;
  userModel: 'Customer' | 'Vendor' | 'FleetManager' | 'DeliveryPartner';
  lastSettlementDate?: Date;
  totalUnpaidTax: number;
  totalTax: number;
  totalUnpaidEarnings: number;
  totalEarnings: number;
  totalRiderPayable: number;
  totalFleetEarnings: number;

  createdAt: Date;
  updatedAt: Date;
};
