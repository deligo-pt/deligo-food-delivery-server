import { Schema, model } from 'mongoose';
import { TAddonGroup } from './addOns.interface';
import { localizedSchema } from '../../constant/GlobalModel/language.model';

const addonOptionSchema = new Schema(
  {
    name: { type: localizedSchema, required: true },
    sku: { type: String, required: true },
    price: { type: Number, required: true },
    tax: {
      type: Schema.Types.ObjectId,
      ref: 'Tax',
      required: [true, 'Tax reference is required for each addon option'],
    },
    isActive: { type: Boolean, default: true },
  },
  { _id: false },
);

const addonGroupSchema = new Schema<TAddonGroup>(
  {
    vendorId: { type: Schema.Types.ObjectId, ref: 'Vendor', required: true },
    title: { type: localizedSchema },
    minSelectable: { type: Number, default: 0 },
    maxSelectable: { type: Number, default: 1 },
    options: [addonOptionSchema],
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true },
);

addonGroupSchema.index({ 'options.sku': 1 }, { unique: true, sparse: true });

export const AddonGroup = model<TAddonGroup>('AddonGroup', addonGroupSchema);
