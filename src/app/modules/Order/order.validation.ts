import { z } from 'zod';

const checkoutValidationSchema = z.object({
  body: z.object({
    useCart: z.boolean().optional().default(false),
    items: z
      .array(
        z.object({
          productId: z.string().min(1, 'Product ID is required'),
          quantity: z.number().min(1, 'Quantity must be at least 1').optional(),
        })
      )
      .optional(),

    deliveryCharge: z
      .number()
      .min(0, 'Delivery charge cannot be negative')
      .optional(),

    estimatedDeliveryTime: z.string().optional(),
    discount: z.number().optional(),
  }),
});

// accept or reject order validation schema
const acceptOrRejectOrderValidationSchema = z.object({
  body: z.object({
    type: z.enum(['ACCEPTED', 'REJECTED'], {
      required_error: 'Action type is required',
    }),
  }),
});

export const OrderValidation = {
  checkoutValidationSchema,
  acceptOrRejectOrderValidationSchema,
};
