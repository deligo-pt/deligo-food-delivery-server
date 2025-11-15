import { model, Schema } from 'mongoose';
import { TRating } from './rating.interface';

const ratingSchema = new Schema<TRating>(
  {
    ratingType: {
      type: String,
      enum: ['DELIVERY_PARTNER', 'PRODUCT', 'FLEET_MANAGER', 'VENDOR'],
      required: true,
    },
    rating: { type: Number, min: 1, max: 5, required: true },
    review: { type: String, default: '' },

    reviewerId: { type: String, required: true },

    deliveryPartnerId: { type: String, index: true },
    productId: { type: String, index: true },
    vendorId: { type: String, index: true },
    fleetManagerId: { type: String, index: true },

    orderId: { type: String, index: true },
  },
  { timestamps: true }
);

// Prevent duplicate rating per order per ratingType
ratingSchema.index(
  { orderId: 1, ratingType: 1 },
  { unique: true, sparse: true }
);

export const Rating = model<TRating>('Rating', ratingSchema);
