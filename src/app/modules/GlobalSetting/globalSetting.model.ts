import { Schema, model, Document } from 'mongoose';

export interface IGlobalSettings extends Document {
  deliveryChargePerMeter: number;
  baseDeliveryCharge?: number;
  minDeliveryCharge?: number;
  freeDeliveryAbove?: number;
  updatedAt?: Date;
}

const GlobalSettingsSchema = new Schema<IGlobalSettings>(
  {
    deliveryChargePerMeter: { type: Number, required: true, default: 0.05 },
    baseDeliveryCharge: { type: Number, default: 0 },
    minDeliveryCharge: { type: Number, default: 0 },
    freeDeliveryAbove: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const GlobalSettings = model<IGlobalSettings>(
  'GlobalSettings',
  GlobalSettingsSchema
);
