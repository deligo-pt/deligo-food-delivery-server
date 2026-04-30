import mongoose from 'mongoose';

export type TTransaction = {
  _id: string;
  transactionId: string;
  orderId?: mongoose.Types.ObjectId;
  payoutId?: mongoose.Types.ObjectId;
  userObjectId: mongoose.Types.ObjectId;
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
    | 'PLATFORM_COMMISSION'
    | 'INGREDIENT_PURCHASE'
    | 'REFERRAL_BONUS';

  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  paymentMethod:
    | 'CARD'
    | 'MB_WAY'
    | 'PAYPAL'
    | 'APPLE_PAY'
    | 'GOOGLE_PAY'
    | 'WALLET'
    | 'CASH'
    | 'BANK_TRANSFER'
    | 'DeliGO_PAY'
    | 'OTHER';
  remarks: string;
  processedBy?: mongoose.Types.ObjectId;
  processorModel?: 'Admin' | 'FleetManager';
  createdAt: Date;
  updatedAt: Date;
};
