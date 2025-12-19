import { z } from 'zod';

// create coupon validation schema
const createCouponValidationSchema = z.object({
  body: z.object({
    code: z
      .string({ required_error: 'Coupon code is required' })
      .min(3, 'Coupon code must be at least 3 characters')
      .toUpperCase(),
    createdBy: z
      .string({ required_error: 'Creator ID is required' })
      .optional(),
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

// update coupon validation schema
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
    isDeleted: z.boolean().optional(),
  }),
});

// apply coupon validation schema
const applyCouponValidationSchema = z.object({
  body: z.object({
    couponId: z
      .string({ required_error: 'Coupon id is required' })
      .min(1, 'Please provide a valid coupon code'),
    type: z.enum(['CART', 'CHECKOUT'], {
      required_error: 'Type is required',
    }),
  }),
});

export const CouponValidation = {
  createCouponValidationSchema,
  updateCouponValidationSchema,
  applyCouponValidationSchema,
};
