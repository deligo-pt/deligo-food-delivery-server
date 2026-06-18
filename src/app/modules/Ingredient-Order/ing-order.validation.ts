import { z } from 'zod';

const createIngredientOrderValidationSchema = z.object({
  body: z
    .object({
      orderDetails: z
        .array(
          z
            .object({
              quantity: z
                .number({
                  required_error: 'Quantity is required',
                })
                .int('Quantity must be an integer')
                .positive('Quantity must be greater than 0'),

              ingredientId: z
                .string({
                  required_error: 'Ingredient ID is required',
                })
                .regex(/^[0-9a-fA-F]{24}$/, 'Invalid Ingredient ID'),
            })
            .strict(),
        )
        .nonempty('Order must contain at least one ingredient'),

      paymentMethod: z.enum(
        ['CARD', 'MB_WAY', 'APPLE_PAY', 'PAYPAL', 'GOOGLE_PAY', 'OTHER'],
        {
          required_error: 'Payment method is required',
          invalid_type_error: 'Invalid payment method',
        },
      ),
    })
    .strict(),
});

const confirmIngredientOrderValidationSchema = z.object({
  body: z
    .object({
      orderId: z
        .string({
          required_error: 'Order ID is required.',
          invalid_type_error: 'Order ID must be a string.',
        })
        .min(1, 'Order id cannot be empty.'),

      paymentToken: z
        .string({
          required_error: 'Payment token is required.',
          invalid_type_error: 'Payment token must be a string.',
        })
        .min(1, 'Payment token cannot be empty.'),
    })
    .strict(),
});

export const IngredientOrderValidation = {
  createIngredientOrderValidationSchema,
  confirmIngredientOrderValidationSchema,
};
