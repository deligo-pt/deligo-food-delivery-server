export const OFFER_TYPE = {
  PERCENT: 'PERCENT',
  FLAT: 'FLAT',
  FREE_DELIVERY: 'FREE_DELIVERY',
  BOGO: 'BOGO',
} as const;

export type OfferType = keyof typeof OFFER_TYPE;
