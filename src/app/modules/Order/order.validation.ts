import { z } from 'zod';

// accept or reject order validation schema
const acceptOrRejectOrderValidationSchema = z.object({
  body: z.object({
    type: z.enum(['PENDING', 'ACCEPTED', 'REJECTED', 'ASSIGNED', 'CANCELED'], {
      required_error: 'Action type is required',
    }),
    reason: z.string().optional(),
  }),
});

export const OrderValidation = {
  acceptOrRejectOrderValidationSchema,
};
