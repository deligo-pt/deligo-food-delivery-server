import { z } from 'zod';

const checkoutValidationSchema = z.object({
  body: z
    .object({
      fulfillmentType: z.enum(['DELIVERY', 'PICKUP']).optional().default('DELIVERY'),
      // Required only for PICKUP — ISO datetime string for today's requested
      // pickup time (e.g. "2026-08-08T20:00:00.000Z"). Store-hours / same-day /
      // future-time checks happen in the service layer against the vendor's
      // businessDetails, not here.
      pickupTime: z.string().optional(),
      useCart: z.boolean().optional().default(false),
      items: z
        .array(
          z
            .object({
              productId: z
                .string({ required_error: 'Product ID is required' })
                .min(1, 'Product ID is required'),
              quantity: z
                .number({ required_error: 'Quantity is required' })
                .min(1, 'Quantity must be at least 1'),
              variationSku: z.string().optional(),
            })
            .strict(),
        )
        .optional(),
    })
    .strict()
    .refine(
      (data) => {
        if (data.useCart === false) {
          return Array.isArray(data.items) && data.items.length > 0;
        }
        return true;
      },
      {
        message: 'Items are required for direct checkout when not using cart',
        path: ['items'],
      },
    )
    .refine(
      (data) => {
        if (data.fulfillmentType === 'PICKUP') {
          return !!data.pickupTime;
        }
        return true;
      },
      {
        message: 'pickupTime is required for self-pickup orders',
        path: ['pickupTime'],
      },
    ),
});

export const CheckoutValidation = {
  checkoutValidationSchema,
};
