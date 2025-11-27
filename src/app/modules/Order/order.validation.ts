import { z } from 'zod';

// accept or reject order validation schema
const acceptOrRejectOrderValidationSchema = z.object({
  body: z.object({
    type: z.enum(['ACCEPTED', 'REJECTED', 'CANCELED'], {
      required_error: 'Action type is required',
    }),
  }),
});

export const OrderValidation = {
  acceptOrRejectOrderValidationSchema,
};
