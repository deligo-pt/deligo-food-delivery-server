import crypto from 'crypto';
import config from '../config';

// Signs an orderId so the invoice-download link mailed to customers works without
// a login session, while still preventing anyone from guessing another order's PDF
// by just changing the orderId in the URL (the old vulnerability).
const HEX_64 = /^[a-f0-9]{64}$/i;

const sign = (orderId: string): string =>
  crypto
    .createHmac('sha256', config.jwt.jwt_access_secret as string)
    .update(`invoice-download:${orderId}`)
    .digest('hex');

export const generateInvoiceAccessToken = (orderId: string): string =>
  sign(orderId);

export const verifyInvoiceAccessToken = (
  orderId: string,
  token: unknown,
): boolean => {
  if (typeof token !== 'string' || !HEX_64.test(token)) {
    return false;
  }

  const expected = Buffer.from(sign(orderId), 'hex');
  const provided = Buffer.from(token, 'hex');

  return crypto.timingSafeEqual(expected, provided);
};
