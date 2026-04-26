import { model, Schema } from 'mongoose';
import { TRestrictedItem } from './restrictedItems.interface';

const restrictedItemSchema = new Schema<TRestrictedItem>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    reason: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      enum: ['TOBACCO', 'ALCOHOL', 'ADULT_CONTENT', 'DANGEROUS_GOODS', 'OTHER'],
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

export const RestrictedItem = model<TRestrictedItem>(
  'RestrictedItem',
  restrictedItemSchema,
);
