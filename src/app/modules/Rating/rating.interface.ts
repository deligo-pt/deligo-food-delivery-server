import { Types } from 'mongoose';

export type TRatingType =
  | 'DELIVERY_PARTNER'
  | 'PRODUCT'
  | 'FLEET_MANAGER'
  | 'VENDOR';

export type TRefModel =
  | 'Customer'
  | 'Vendor'
  | 'FleetManager'
  | 'DeliveryPartner'
  | 'Product';

export type TRating = {
  _id?: string | Types.ObjectId;
  ratingType: TRatingType;
  rating: number;
  review?: string;

  reviewerId: string | Types.ObjectId;
  reviewerModel: TRefModel;

  targetId: string | Types.ObjectId;
  targetModel: TRefModel;

  orderId: string | Types.ObjectId;
  productId?: string | Types.ObjectId;

  tags?: string[];
  createdAt?: Date;
  updatedAt?: Date;
};
