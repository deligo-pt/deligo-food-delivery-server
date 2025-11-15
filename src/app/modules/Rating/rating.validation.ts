import { z } from 'zod';

// Zod Validation Schema for Rating
const ratingValidationSchema = z.object({
  body: z.object({
    ratingType: z.enum([
      'DELIVERY_PARTNER',
      'PRODUCT',
      'FLEET_MANAGER',
      'VENDOR',
    ]),
    rating: z.number().min(1).max(5),
    review: z.string().optional(),

    reviewerId: z.string(),

    deliveryPartnerId: z.string().optional(),
    productId: z.string().optional(),
    vendorId: z.string().optional(),
    fleetManagerId: z.string().optional(),

    orderId: z.string().optional(),
  }),
});

export const RatingValidation = {
  ratingValidationSchema,
};
