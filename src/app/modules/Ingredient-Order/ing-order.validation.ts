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

export const IngredientOrderValidation = {
  createIngredientOrderValidationSchema,
};
