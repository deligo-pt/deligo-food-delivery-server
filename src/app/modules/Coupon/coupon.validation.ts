import { z } from 'zod';

// create coupon validation schema
const createCouponValidationSchema = z.object({
  body: z.object({
    code: z.string().min(3).toUpperCase(),
    discountType: z.enum(['PERCENT', 'FLAT']),
    discountValue: z.number().positive(),
    isGlobal: z.boolean().optional().default(false),
    minPurchase: z.number().nonnegative().optional(),
    maxDiscount: z.number().nonnegative().optional(),
    usageLimit: z.number().int().min(1).optional(),
    userUsageLimit: z.number().int().min(1).optional(),
    validFrom: z.coerce.date().optional(),
    expiresAt: z.coerce.date({ required_error: 'Expiry date is required' }),
    applicableCategories: z.array(z.string()).optional(),
    applicableProducts: z.array(z.string()).optional(),
  }),
});

// update coupon validation schema
const updateCouponValidationSchema = z.object({
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
    applicableProducts: z.array(z.string()).optional(),
    isActive: z.boolean().optional(),
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
