import mongoose from 'mongoose';

export type TTransaction = {
  _id: string;
  transactionId: string;
  orderId?: mongoose.Types.ObjectId;
  payoutId?: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  userModel:
  | 'Customer'
  | 'Vendor'
  | 'FleetManager'
  | 'DeliveryPartner'
  | 'Admin';
  baseAmount: number;
  taxAmount: number;
  totalAmount: number;
  type:
  | 'ORDER_PAYMENT'
  | 'VENDOR_EARNING'
  | 'FLEET_EARNING'
  | 'DELIVERY_PARTNER_EARNING'
  | 'VENDOR_SETTLEMENT'
  | 'FLEET_SETTLEMENT'
  | 'DELIVERY_PARTNER_SETTLEMENT'
  | 'PLATFORM_COMMISSION';

  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  paymentMethod:
  | 'CARD'
  | 'MB_WAY'
  | 'WALLET'
  | 'CASH'
  | 'BANK_TRANSFER'
  | 'OTHER';
  remarks: string;
  processedBy?: mongoose.Types.ObjectId;
  processorModel?: 'Admin' | 'FleetManager';
  createdAt: Date;
  updatedAt: Date;
};
