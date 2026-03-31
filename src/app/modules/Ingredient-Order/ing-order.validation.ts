import { z } from 'zod';

const createIngredientOrderValidationSchema = z.object({
    body: z.object({
        orderDetails: z.object({
            totalQuantity: z.number().positive('Quantity must be greater than 0'),
            ingredient: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Ingredient ID'),
        }),
        paymentMethod: z.enum([
            'CARD',
            'MB_WAY',
            'APPLE_PAY',
            'PAYPAL',
            'GOOGLE_PAY',
            'OTHER',
        ], {
            required_error: 'Payment method is required',
        }),
    }),
});

export const IngredientOrderValidation = {
    createIngredientOrderValidationSchema,
};