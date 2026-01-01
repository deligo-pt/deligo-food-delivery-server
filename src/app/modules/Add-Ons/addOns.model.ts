import { Schema, model } from 'mongoose';
import { TAddonGroup } from './addOns.interface';

const addonGroupSchema = new Schema<TAddonGroup>(
  {
    vendorId: { type: Schema.Types.ObjectId, ref: 'Vendor', required: true },
    title: { type: String, required: true },
    minSelectable: { type: Number, default: 0 },
    maxSelectable: { type: Number, default: 1 },
    options: [
      {
        name: { type: String, required: true },
        price: { type: Number, required: true },
        isActive: { type: Boolean, default: true },
      },
    ],
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const AddonGroup = model<TAddonGroup>('AddonGroup', addonGroupSchema);
