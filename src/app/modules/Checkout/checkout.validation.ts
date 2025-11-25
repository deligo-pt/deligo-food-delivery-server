import z from 'zod';

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

    estimatedDeliveryTime: z.string().optional(),
    discount: z.number().optional(),
  }),
});

export const CheckoutValidation = {
  checkoutValidationSchema,
};
