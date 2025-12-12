import { TCustomer } from '../modules/Customer/customer.interface';

export const getCustomerCoordinates = (
  customer: TCustomer
): [number, number] | null => {
  // 1) Live location
  if (
    customer.currentSessionLocation &&
    customer.currentSessionLocation.isSharingActive &&
    Array.isArray(customer.currentSessionLocation.coordinates)
  ) {
    // [lng, lat]
    const [lng, lat] = customer.currentSessionLocation.coordinates;
    if (typeof lat === 'number' && typeof lng === 'number') {
      return [lat, lng];
    }
  }

  // 2) Active delivery address
  const active = customer.deliveryAddresses?.find(
    (a) =>
      a.isActive &&
      typeof a.longitude === 'number' &&
      typeof a.latitude === 'number'
  );
  if (active) return [active.longitude as number, active.latitude as number];

  // 3) Primary address
  if (
    typeof customer.address?.longitude === 'number' &&
    typeof customer.address?.latitude === 'number'
  ) {
    return [customer.address.longitude, customer.address.latitude];
  }

  return null;
};
