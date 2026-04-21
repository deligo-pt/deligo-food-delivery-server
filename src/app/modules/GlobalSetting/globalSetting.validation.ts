import z from 'zod';

const referralMilestoneSchema = z.object({
  friendsRequired: z.number().positive('Friends required must be > 0'),
  rewardType: z.enum(['CASHBACK', 'FREE_MEAL', 'FREE_DELIVERY', 'CREDIT']),
  rewardValue: z.number().nonnegative('Reward value must be >= 0'),
  minOrderAmountPerFriend: z
    .number()
    .nonnegative('Min order amount must be >= 0'),
});

const createGlobalSettingValidationSchema = z.object({
  body: z.object({
    // Delivery Pricing
    delivery: z
      .object({
        baseCharge: z.number().nonnegative(),
        chargePerKm: z.number().nonnegative(),
        minCharge: z.number().nonnegative(),
        maxCharge: z.number().nonnegative(),
        freeAbove: z.number().nonnegative(),
        maxDistanceKm: z.number().nonnegative(),
        vatRate: z.number().min(0).max(100),
      })
      .optional(),

    // Commission & VAT
    commission: z
      .object({
        platformPercent: z.number().min(0).max(100),
        platformVatRate: z.number().min(0).max(100),
        fleetManagerPercent: z.number().min(0).max(100),
        deliveryPartnerPercent: z.number().min(0).max(100),
        vendorVatPercent: z.number().min(0).max(100),
      })
      .optional(),

    // Order Rules & Automation
    order: z
      .object({
        minAmount: z.number().nonnegative(),
        maxAmount: z.number().nonnegative(),
        maxItemsPerOrder: z.number().positive(),
        nearestVendorRadiusKm: z.number().positive(),
        autoCancelUnacceptedMinutes: z.number().nonnegative(),
        autoMarkDeliveredMinutes: z.number().nonnegative(),
        cancelTimeLimitMinutes: z.number().nonnegative(),
      })
      .optional(),

    // Loyalty & Rewards
    rewards: z
      .object({
        customerPointsPerEuro: z.number().nonnegative(),
        riderPointsPerDelivery: z.number().nonnegative(),
        referralPoints: z.number().nonnegative(),
        newRiderWelcomeBonus: z.number().nonnegative(),
        pointsExpiryDays: z.number().nonnegative(),
        customerReferralMilestones: z.array(referralMilestoneSchema),
      })
      .optional(),

    // Security & System State
    system: z
      .object({
        isPlatformLive: z.boolean(),
        maintenanceMessage: z.string().max(300).optional(),
        isOfferEnabled: z.boolean(),
        maxDiscountPercent: z.number().min(0).max(100),
        refundProcessingDays: z.number().nonnegative(),
        otp: z.object({
          enabled: z.boolean(),
          length: z.number().min(4).max(8),
          expiryMinutes: z.number().positive(),
        }),
      })
      .optional(),
  }),
});

const updateGlobalSettingValidationSchema = z.object({
  body: z.object({
    delivery: z
      .object({
        baseCharge: z.number().nonnegative().optional(),
        chargePerKm: z.number().nonnegative().optional(),
        minCharge: z.number().nonnegative().optional(),
        maxCharge: z.number().nonnegative().optional(),
        freeAbove: z.number().nonnegative().optional(),
        maxDistanceKm: z.number().nonnegative().optional(),
        vatRate: z.number().min(0).max(100).optional(),
      })
      .optional(),

    commission: z
      .object({
        platformPercent: z.number().min(0).max(100).optional(),
        platformVatRate: z.number().min(0).max(100).optional(),
        fleetManagerPercent: z.number().min(0).max(100).optional(),
        deliveryPartnerPercent: z.number().min(0).max(100).optional(),
        vendorVatPercent: z.number().min(0).max(100).optional(),
      })
      .optional(),

    order: z
      .object({
        minAmount: z.number().nonnegative().optional(),
        maxAmount: z.number().nonnegative().optional(),
        maxItemsPerOrder: z.number().positive().optional(),
        nearestVendorRadiusKm: z.number().positive().optional(),
        autoCancelUnacceptedMinutes: z.number().nonnegative().optional(),
        autoMarkDeliveredMinutes: z.number().nonnegative().optional(),
        cancelTimeLimitMinutes: z.number().nonnegative().optional(),
      })
      .optional(),

    rewards: z
      .object({
        customerPointsPerEuro: z.number().nonnegative().optional(),
        riderPointsPerDelivery: z.number().nonnegative().optional(),
        referralPoints: z.number().nonnegative().optional(),
        newRiderWelcomeBonus: z.number().nonnegative().optional(),
        pointsExpiryDays: z.number().nonnegative().optional(),
        customerReferralMilestones: z.array(referralMilestoneSchema).optional(),
      })
      .optional(),

    system: z
      .object({
        isPlatformLive: z.boolean().optional(),
        maintenanceMessage: z.string().max(300).optional(),
        isOfferEnabled: z.boolean().optional(),
        maxDiscountPercent: z.number().min(0).max(100).optional(),
        refundProcessingDays: z.number().nonnegative().optional(),
        otp: z
          .object({
            enabled: z.boolean().optional(),
            length: z.number().min(4).max(8).optional(),
            expiryMinutes: z.number().positive().optional(),
          })
          .optional(),
      })
      .optional(),
  }),
});

export const GlobalSettingValidation = {
  createGlobalSettingValidationSchema,
  updateGlobalSettingValidationSchema,
};
