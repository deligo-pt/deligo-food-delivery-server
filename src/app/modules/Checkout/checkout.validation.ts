import { z } from 'zod';

const checkoutValidationSchema = z.object({
  body: z
    .object({
      useCart: z.boolean().optional().default(false),
      items: z
        .array(
          z
            .object({
              productId: z.string().min(1, 'Product ID is required'),
              quantity: z.number().min(1, 'Quantity must be at least 1'),
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
    ),
});

export const CheckoutValidation = {
  checkoutValidationSchema,
};
