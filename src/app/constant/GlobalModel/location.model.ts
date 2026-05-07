import { Schema } from 'mongoose';

export const liveLocationSchema = new Schema(
  {
    type: { type: String, enum: ['Point'], default: 'Point', required: true },
    coordinates: { type: [Number], required: true }, // [longitude, latitude]
    geoAccuracy: { type: Number },
    heading: { type: Number },
    speed: { type: Number },
    isMocked: { type: Boolean, default: false },
    lastLocationUpdate: { type: Date, default: Date.now, required: true },
  },
  {
    _id: false,
  },
);
