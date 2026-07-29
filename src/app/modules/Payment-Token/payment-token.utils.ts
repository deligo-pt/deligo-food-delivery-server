import { TCardBrand } from './payment-token.interface';

export const resolveCardBrand = (cardNumber: string): TCardBrand => {
  const digits = cardNumber.replace(/\D/g, '');

  if (/^4/.test(digits)) return 'VISA';
  if (/^(5[1-5]|2(2[2-9]|[3-6]\d|7[01]|720))/.test(digits)) return 'MASTERCARD';
  if (/^3[47]/.test(digits)) return 'AMEX';

  return 'OTHER';
};

export const extractLast4 = (cardNumber: string): string =>
  cardNumber.replace(/\D/g, '').slice(-4);

export const formatExpiryDate = (expMonth: string, expYear: string): string => {
  const month = expMonth.padStart(2, '0');
  const year = expYear.length === 4 ? expYear.slice(-2) : expYear;
  return `${month}/${year}`;
};

export const formatSavedCardLabel = (
  brand: TCardBrand,
  last4: string,
): string => {
  const displayBrand =
    brand === 'OTHER' ? 'Card' : brand.charAt(0) + brand.slice(1).toLowerCase();
  return `${displayBrand} ending in ${last4}`;
};
