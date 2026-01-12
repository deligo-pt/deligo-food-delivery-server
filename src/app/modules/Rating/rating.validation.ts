import { z } from 'zod';

const subRatingsSchema = z
  .object({
    foodQuality: z.number().min(1).max(5).optional(),
    packaging: z.number().min(1).max(5).optional(),
    deliverySpeed: z.number().min(1).max(5).optional(),
    riderBehavior: z.number().min(1).max(5).optional(),
  })
  .optional();

const createRatingValidationSchema = z.object({
  body: z.object({
    ratingType: z.enum(['DELIVERY_PARTNER', 'PRODUCT', 'VENDOR']),
    rating: z
      .number()
      .min(1, { message: 'Rating must be at least 1' })
      .max(5, { message: 'Rating cannot exceed 5' }),
    review: z.string().optional().default(''),

    reviewerId: z
      .string({ required_error: 'Reviewer ID is required' })
      .optional(),
    reviewerModel: z.enum(['Customer', 'Vendor', 'DeliveryPartner']).optional(),

    targetId: z.string({ required_error: 'Target ID is required' }).optional(),
    targetModel: z.enum(['Vendor', 'DeliveryPartner', 'Product']).optional(),

    orderId: z.string({ required_error: 'Order ID is required for tracking' }),
    productId: z.string().optional(),

    subRatings: subRatingsSchema,

    tags: z.array(z.string()).optional().default([]),
  }),
});

export const RatingValidation = {
  createRatingValidationSchema,
};
