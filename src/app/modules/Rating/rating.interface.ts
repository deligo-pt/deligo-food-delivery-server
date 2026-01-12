import mongoose from 'mongoose';

export type TRatingType = 'DELIVERY_PARTNER' | 'PRODUCT' | 'VENDOR';

export type TRefModel = 'Customer' | 'Vendor' | 'DeliveryPartner' | 'Product';

export type TSubRatings = {
  foodQuality?: number;
  packaging?: number;
  deliverySpeed?: number;
  riderBehavior?: number;
};
export type TRatingSentiment = 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
export type TRating = {
  _id?: mongoose.Types.ObjectId;
  ratingType: TRatingType;
  rating: number;
  sentiment?: TRatingSentiment;
  review?: string;

  reviewerId: mongoose.Types.ObjectId;
  reviewerModel: TRefModel;

  targetId: mongoose.Types.ObjectId;
  targetModel: TRefModel;

  orderId: mongoose.Types.ObjectId;
  productId?: mongoose.Types.ObjectId;

  subRatings?: TSubRatings;

  tags?: string[];
  createdAt?: Date;
  updatedAt?: Date;
};
