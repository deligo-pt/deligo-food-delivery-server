import { Types } from 'mongoose';

export type TCouponType = 'FREE_MEAL' | 'FREE_DELIVERY';

export type TCoupon = {
  userObjectId: Types.ObjectId;
  userModel:
    | 'Customer'
    | 'Vendor'
    | 'DeliveryPartner'
    | 'FleetManager'
    | 'Admin';
  code: string;
  type: TCouponType;
  isUsed: boolean;
  expiryDate?: Date;
  remarks?: string;
  createdAt: Date;
  updatedAt: Date;
};
