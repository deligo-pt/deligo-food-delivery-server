export const PAYMENT_METHOD = {
  CARD: 'CARD',
  MB_WAY: 'MB_WAY',
  APPLE_PAY: 'APPLE_PAY',
  PAYPAL: 'PAYPAL',
  GOOGLE_PAY: 'GOOGLE_PAY',
  OTHER: 'OTHER',
} as const;

export type TPaymentMethod = keyof typeof PAYMENT_METHOD;

export const PAYMENT_STATUS = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  PAID: 'PAID',
  FAILED: 'FAILED',
  REFUNDED: 'REFUNDED',
} as const;

export type TOrderPaymentStatus = keyof typeof PAYMENT_STATUS;
