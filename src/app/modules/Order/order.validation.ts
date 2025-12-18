import { z } from 'zod';

// accept or reject order validation schema
const acceptOrRejectOrderValidationSchema = z.object({
  body: z.object({
    type: z.enum(['ACCEPTED', 'REJECTED', 'CANCELED'], {
      required_error: 'Action type is required',
    }),
    reason: z.string().optional(),
  }),
});

// update order status by delivery partner validation schema
const updateOrderStatusByDeliveryPartnerValidationSchema = z.object({
  body: z.object({
    orderStatus: z.enum(['REASSIGNMENT_NEEDED', 'ON_THE_WAY', 'DELIVERED']),
    reason: z.string().optional(),
  }),
});

export const OrderValidation = {
  acceptOrRejectOrderValidationSchema,
  updateOrderStatusByDeliveryPartnerValidationSchema,
};
