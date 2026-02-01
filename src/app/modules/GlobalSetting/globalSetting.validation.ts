import z from 'zod';

const createGlobalSettingValidationSchema = z.object({
  body: z.object({
    // --------------------------------------------------
    // Delivery Pricing
    // --------------------------------------------------
    deliveryChargePerKm: z
      .number()
      .nonnegative('Delivery charge per km must be >= 0')
      .optional(),

    baseDeliveryCharge: z
      .number()
      .nonnegative('Base delivery charge must be >= 0')
      .optional(),

    minDeliveryCharge: z
      .number()
      .nonnegative('Min delivery charge must be >= 0')
      .optional(),

    maxDeliveryCharge: z
      .number()
      .nonnegative('Max delivery charge must be >= 0')
      .optional(),

    freeDeliveryAbove: z
      .number()
      .nonnegative('Free delivery amount must be >= 0')
      .optional(),

    maxDeliveryDistanceKm: z
      .number()
      .positive('Max delivery distance must be > 0')
      .optional(),

    // --------------------------------------------------
    // Platform Commission
    // --------------------------------------------------
    platformCommissionPercent: z.number().min(0).max(100).optional(),

    fleetManagerCommissionPercent: z.number().min(0).max(100).optional(),
    deliveryPartnerCommissionPercent: z.number().min(0).max(100).optional(),

    vendorVatPercent: z.number().min(0).max(100).optional(),

    // --------------------------------------------------
    // Order Rules
    // --------------------------------------------------
    minOrderAmount: z.number().nonnegative().optional(),
    maxOrderAmount: z.number().positive().optional(),
    maxItemsPerOrder: z.number().positive().optional(),

    // --------------------------------------------------
    // Cancellation & Refund
    // --------------------------------------------------
    cancelTimeLimitMinutes: z.number().positive().optional(),
    refundProcessingDays: z.number().positive().optional(),

    // --------------------------------------------------
    // Coupons & Offers
    // --------------------------------------------------
    isCouponEnabled: z.boolean().optional(),
    isOfferEnabled: z.boolean().optional(),

    maxDiscountPercent: z.number().min(0).max(100).optional(),

    // --------------------------------------------------
    // Order Automation
    // --------------------------------------------------
    autoCancelUnacceptedOrderMinutes: z.number().positive().optional(),
    autoMarkDeliveredAfterMinutes: z.number().positive().optional(),

    // --------------------------------------------------
    // OTP & Security
    // --------------------------------------------------
    orderOtpEnabled: z.boolean().optional(),

    otpLength: z
      .number()
      .min(4, 'OTP length must be at least 4')
      .max(8, 'OTP length cannot exceed 8')
      .optional(),

    otpExpiryMinutes: z.number().positive().optional(),

    // --------------------------------------------------
    // Platform State
    // --------------------------------------------------
    isPlatformLive: z.boolean().optional(),

    maintenanceMessage: z
      .string()
      .max(300, 'Maintenance message too long')
      .optional(),
  }),
});

const updateGlobalSettingValidationSchema = z.object({
  body: z.object({
    // --------------------------------------------------
    // Delivery Pricing
    // --------------------------------------------------
    deliveryChargePerKm: z.number().nonnegative().optional(),

    baseDeliveryCharge: z.number().nonnegative().optional(),

    minDeliveryCharge: z.number().nonnegative().optional(),

    maxDeliveryCharge: z.number().nonnegative().optional(),

    freeDeliveryAbove: z.number().nonnegative().optional(),

    maxDeliveryDistanceKm: z.number().positive().optional(),

    // --------------------------------------------------
    // Platform Commission
    // --------------------------------------------------
    platformCommissionPercent: z.number().min(0).max(100).optional(),

    deliveryPartnerCommissionPercent: z.number().min(0).max(100).optional(),

    vendorVatPercent: z.number().min(0).max(100).optional(),

    // --------------------------------------------------
    // Order Rules
    // --------------------------------------------------
    minOrderAmount: z.number().nonnegative().optional(),

    maxOrderAmount: z.number().positive().optional(),

    maxItemsPerOrder: z.number().positive().optional(),

    // --------------------------------------------------
    // Cancellation & Refund
    // --------------------------------------------------
    cancelTimeLimitMinutes: z.number().positive().optional(),

    refundProcessingDays: z.number().positive().optional(),

    // --------------------------------------------------
    // Coupons & Offers
    // --------------------------------------------------
    isCouponEnabled: z.boolean().optional(),

    isOfferEnabled: z.boolean().optional(),

    maxDiscountPercent: z.number().min(0).max(100).optional(),

    // --------------------------------------------------
    // Order Automation
    // --------------------------------------------------
    autoCancelUnacceptedOrderMinutes: z.number().positive().optional(),

    autoMarkDeliveredAfterMinutes: z.number().positive().optional(),

    // --------------------------------------------------
    // OTP & Security
    // --------------------------------------------------
    orderOtpEnabled: z.boolean().optional(),

    otpLength: z.number().min(4).max(8).optional(),

    otpExpiryMinutes: z.number().positive().optional(),

    // --------------------------------------------------
    // Platform State
    // --------------------------------------------------
    isPlatformLive: z.boolean().optional(),

    maintenanceMessage: z.string().max(300).optional(),
  }),
});

export const GlobalSettingValidation = {
  createGlobalSettingValidationSchema,
  updateGlobalSettingValidationSchema,
};
