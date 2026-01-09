import { model, Schema } from 'mongoose';
import { TRating } from './rating.interface';

const ratingSchema = new Schema<TRating>(
  {
    ratingType: {
      type: String,
      enum: ['DELIVERY_PARTNER', 'PRODUCT', 'FLEET_MANAGER', 'VENDOR'],
      required: true,
      index: true,
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      required: true,
    },
    review: {
      type: String,
      trim: true,
      default: '',
    },

    reviewerId: {
      type: Schema.Types.ObjectId,
      required: true,
      refPath: 'reviewerModel',
    },
    reviewerModel: {
      type: String,
      required: true,
      enum: ['Customer', 'Vendor', 'FleetManager', 'DeliveryPartner'],
    },

    targetId: {
      type: Schema.Types.ObjectId,
      required: true,
      refPath: 'targetModel',
      index: true,
    },
    targetModel: {
      type: String,
      required: true,
      enum: [
        'Customer',
        'Vendor',
        'FleetManager',
        'DeliveryPartner',
        'Product',
      ],
    },

    productId: { type: Schema.Types.ObjectId, ref: 'Product' },

    orderId: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      index: true,
    },

    tags: { type: [String], default: [] },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

ratingSchema.index({ targetId: 1, rating: -1 });

export const Rating = model<TRating>('Rating', ratingSchema);
