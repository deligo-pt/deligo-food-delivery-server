import z from 'zod';

const addOrderPointsValidationSchema = z.object({
  body: z
    .object({
      orderId: z.string({ required_error: 'Order ObjectId  is required' }),
    })
    .strict(),
});

const addDeliveryPartnerPointsValidationSchema = z.object({
  body: z
    .object({
      orderId: z.string({ required_error: 'Order ObjectId  is required' }),
    })
    .strict(),
});

export const PointsValidation = {
  addOrderPointsValidationSchema,
  addDeliveryPartnerPointsValidationSchema,
};
