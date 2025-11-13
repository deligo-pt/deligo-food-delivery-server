import { z } from 'zod';

const createCouponValidationSchema = z.object({
  body: z.object({
    code: z
      .string({ required_error: 'Coupon code is required' })
      .min(3, 'Coupon code must be at least 3 characters')
      .toUpperCase(),
    discountType: z.enum(['PERCENT', 'FLAT'], {
      required_error: 'Discount type is required',
    }),
    discountValue: z
      .number({ required_error: 'Discount value is required' })
      .positive('Discount value must be greater than 0'),
    minPurchase: z.number().min(0).optional(),
    maxDiscount: z.number().min(0).optional(),
    usageLimit: z.number().min(1).default(1).optional(),
    validFrom: z.coerce.date().optional(),
    expiresAt: z.coerce.date().optional(),
    applicableCategories: z.array(z.string()).optional(),
    isActive: z.boolean().default(true).optional(),
  }),
});

export const updateCouponValidationSchema = z.object({
  body: z.object({
    code: z.string().optional(),
    discountType: z.enum(['PERCENT', 'FLAT']).optional(),
    discountValue: z.number().positive().optional(),
    minPurchase: z.number().min(0).optional(),
    maxDiscount: z.number().min(0).optional(),
    usageLimit: z.number().min(1).optional(),
    validFrom: z.coerce.date().optional(),
    expiresAt: z.coerce.date().optional(),
    applicableCategories: z.array(z.string()).optional(),
    isActive: z.boolean().optional(),
  }),
});

export const CouponValidation = {
  createCouponValidationSchema,
  updateCouponValidationSchema,
};
