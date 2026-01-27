import { Schema } from 'mongoose';
import { AddressType } from '../modules/Customer/customer.constant';

export type TDeliveryAddress = {
  street?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  longitude?: number;
  latitude?: number;
  geoAccuracy?: number;
  detailedAddress?: string;
  isActive: boolean;

  // Zone Integration & Metadata
  zoneId?: string; // CRITICAL: Links address to a defined delivery zone
  addressType?: keyof typeof AddressType; // e.g., 'Home', 'Work'
  notes?: string; // Specific delivery instructions
};

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
