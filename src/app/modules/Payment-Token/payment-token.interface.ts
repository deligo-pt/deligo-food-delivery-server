import mongoose from 'mongoose';

// Tokenization is only offered for card networks REDUNIQ can store server-side.
// MB WAY / Apple Pay / Google Pay / PayPal never reach this collection.
export type TCardBrand = 'VISA' | 'MASTERCARD' | 'AMEX' | 'OTHER';

export type TPaymentToken = {
  _id?: string;
  customerId: mongoose.Types.ObjectId; // user_id
  tokenId: string; // token_id — REDUNIQ payToken.id, never the PAN
  gatewayRef: string; // our idempotency ref sent as payToken.ref / order.ref for the tokenization call
  cardBrand: TCardBrand; // card_brand
  last4: string; // last4
  expiryDate: string; // expiry_date, "MM/YY"
  cardHolderName?: string;
  isDefault: boolean;
  isActive: boolean; // is_active — soft-delete flag, flipped by disableRecurringPayment
  createdAt?: Date; // created_at
  updatedAt?: Date;
};

export type TSaveCardPayload = {
  card: {
    holderName: string;
    number: string;
    expMonth: string; // "01".."12"
    expYear: string; // "2032"
    secCode: string; // CVV/CVC — relayed to gateway only, never persisted or logged
  };
};
