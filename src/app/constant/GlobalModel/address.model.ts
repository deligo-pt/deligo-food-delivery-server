import { Schema } from 'mongoose';

export const addressSchema = new Schema(
  {
    street: { type: String, default: '' },
    city: { type: String, default: '' },
    state: { type: String, default: '' },
    country: { type: String, default: '' },
    postalCode: { type: String, default: '' },
    longitude: { type: Number, default: null },
    latitude: { type: Number, default: null },
    geoAccuracy: { type: Number, default: null },
    detailedAddress: { type: String, default: '' },
  },
  { _id: false },
);
