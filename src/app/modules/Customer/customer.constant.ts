/* eslint-disable @typescript-eslint/no-explicit-any */
// Searchable fields for Customer
export const CustomerSearchableFields = [
  'name.firstName',
  'name.lastName',
  'email',
  'contactNumber',
  'status',
];

export const AddressType = {
  PRIMARY: 'PRIMARY',
  HOME: 'HOME',
  OFFICE: 'OFFICE',
  OTHER: 'OTHER',
} as const;

export const getAddressSignature = (addr: any) => {
  return [
    addr.street?.trim()?.toLowerCase(),
    addr.city?.trim()?.toLowerCase(),
    addr.state?.trim()?.toLowerCase(),
    addr.country?.trim()?.toLowerCase(),
    addr.postalCode?.trim()?.toLowerCase(),
  ].join('|');
};
