import mongoose from 'mongoose';

export type TTransaction = {
  transactionId: string;
  orderId: mongoose.Types.ObjectId;
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
  paymentMethod: 'CARD' | 'MOBILE';
  remarks: string;
};

export type TWallet = {
  userId: mongoose.Types.ObjectId | string;
  userModel: 'Customer' | 'Vendor' | 'FleetManager' | 'DeliveryPartner';
  lastSettlementDate?: Date;
  totalUnpaidEarnings: number;
  totalRiderPayable: number;
  totalEarnings: number;
};
