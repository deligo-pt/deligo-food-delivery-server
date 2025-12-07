import { Schema, model } from 'mongoose';
import { TZone } from './zone.interface';

const zoneSchema = new Schema<TZone>(
  {
    zoneId: { type: String, required: true, unique: true, trim: true },
    district: { type: String, required: true },
    zoneName: { type: String, required: true },
    boundary: {
      type: {
        type: String,
        enum: ['Polygon'],
        required: true,
        default: 'Polygon',
      },
      coordinates: { type: [[[Number]]], required: true },
    },

    isOperational: { type: Boolean, default: true },
    minDeliveryFee: { type: Number, default: 2.0 },
    maxDeliveryDistanceKm: { type: Number, default: 7.0 },

    isDeleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

zoneSchema.index({ boundary: '2dsphere' });

export const Zone = model<TZone>('Zone', zoneSchema);
