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
  isActive: boolean;

  // Zone Integration & Metadata
  zoneId?: string; // CRITICAL: Links address to a defined delivery zone
  addressType?: keyof typeof AddressType; // e.g., 'Home', 'Work'
  notes?: string; // Specific delivery instructions
};
