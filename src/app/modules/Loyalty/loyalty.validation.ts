import z from 'zod';

const addOrderPointsValidationSchema = z.object({
  body: z.object({
    orderId: z.string({ required_error: 'Order ObjectId  is required' }),
  }),
});

const addDeliveryPartnerPointsValidationSchema = z.object({
  body: z.object({
    orderId: z.string({ required_error: 'Order ObjectId  is required' }),
  }),
});

export const LoyaltyValidation = {
  addOrderPointsValidationSchema,
  addDeliveryPartnerPointsValidationSchema,
};
