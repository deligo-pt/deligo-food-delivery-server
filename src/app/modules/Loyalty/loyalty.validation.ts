import z from 'zod';

const addOrderPointsValidationSchema = z.object({
  body: z.object({
    userId: z.string({ required_error: 'User ObjectId is required' }),
    role: z.string({ required_error: 'User role is required' }),
    orderId: z.string({ required_error: 'Order ObjectId  is required' }),
  }),
});

export const LoyaltyValidation = {
  addOrderPointsValidationSchema,
};
