export const BusinessTypes = [
  'restaurant',
  'grocery',
  'pharmacy',
  'store',
] as const;

export type TBusinessTypes = (typeof BusinessTypes)[number];

export const VendorSearchableFields = [
  'status',
  'businessLocation.city',
  'businessDetails.businessName',
  'businessDetails.businessType',
  'businessDetails.businessLicenseNumber',
  'businessDetails.NIF',
];
