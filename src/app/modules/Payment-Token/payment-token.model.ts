import { Schema, model } from 'mongoose';
import { TPaymentToken } from './payment-token.interface';

const paymentTokenSchema = new Schema<TPaymentToken>(
  {
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
    },
    tokenId: { type: String, required: true },
    gatewayRef: { type: String, required: true },
    cardBrand: {
      type: String,
      enum: ['VISA', 'MASTERCARD', 'AMEX', 'OTHER'],
      required: true,
    },
    last4: { type: String, required: true, minlength: 4, maxlength: 4 },
    expiryDate: { type: String, required: true },
    cardHolderName: { type: String, default: '' },
    isDefault: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

paymentTokenSchema.index({ customerId: 1, tokenId: 1 }, { unique: true });
paymentTokenSchema.index({ customerId: 1, isActive: 1 });

paymentTokenSchema.index(
  { customerId: 1, cardBrand: 1, last4: 1, expiryDate: 1 },
  { unique: true, partialFilterExpression: { isActive: true } },
);

export const PaymentToken = model<TPaymentToken>(
  'PaymentToken',
  paymentTokenSchema,
);
