import { model, Schema } from 'mongoose';
import { TRating } from './rating.interface';

const ratingSchema = new Schema<TRating>(
  {
    ratingType: {
      type: String,
      enum: ['DELIVERY_PARTNER', 'PRODUCT', 'VENDOR'],
      required: true,
      index: true,
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      required: true,
    },
    sentiment: {
      type: String,
      enum: ['POSITIVE', 'NEGATIVE', 'NEUTRAL'],
      index: true,
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
      enum: ['Customer', 'Vendor', 'DeliveryPartner'],
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
      enum: ['Customer', 'Vendor', 'DeliveryPartner', 'Product'],
    },

    productId: { type: Schema.Types.ObjectId, ref: 'Product' },

    orderId: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      index: true,
    },

    subRatings: {
      foodQuality: { type: Number, min: 1, max: 5 },
      packaging: { type: Number, min: 1, max: 5 },
      deliverySpeed: { type: Number, min: 1, max: 5 },
      riderBehavior: { type: Number, min: 1, max: 5 },
    },

    tags: { type: [String], default: [] },
  },
  {
    timestamps: true,
  },
);

ratingSchema.pre('save', function (next) {
  if (this.rating >= 4) {
    this.sentiment = 'POSITIVE';
  } else if (this.rating === 3) {
    this.sentiment = 'NEUTRAL';
  } else {
    this.sentiment = 'NEGATIVE';
  }
  next();
});

ratingSchema.index({ targetId: 1, ratingType: 1 });
ratingSchema.index({ createdAt: -1 });

export const Rating = model<TRating>('Rating', ratingSchema);
