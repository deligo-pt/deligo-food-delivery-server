import z from 'zod';

const saveCardStandaloneValidationSchema = z.object({
  body: z
    .object({
      card: z
        .object({
          holderName: z.string({ required_error: 'Card holder name is required' }).min(2),
          number: z
            .string({ required_error: 'Card number is required' })
            .regex(/^\d{12,19}$/, 'Card number must be 12-19 digits'),
          expMonth: z
            .string({ required_error: 'Expiry month is required' })
            .regex(/^(0[1-9]|1[0-2])$/, 'Expiry month must be between 01-12'),
          expYear: z
            .string({ required_error: 'Expiry year is required' })
            .regex(/^\d{4}$/, 'Expiry year must be a 4-digit year'),
          secCode: z
            .string({ required_error: 'Security code is required' })
            .regex(/^\d{3,4}$/, 'Security code must be 3-4 digits'),
        })
        .strict(),
    })
    .strict(),
});

const payWithSavedTokenValidationSchema = z.object({
  body: z
    .object({
      checkoutSummaryId: z.string({
        required_error: 'Checkout Summary ObjectId is required',
      }),
      paymentTokenId: z.string({
        required_error: 'Saved card reference is required',
      }),
    })
    .strict(),
});

export const PaymentTokenValidation = {
  saveCardStandaloneValidationSchema,
  payWithSavedTokenValidationSchema,
};
