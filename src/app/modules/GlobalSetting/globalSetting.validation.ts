import z from 'zod';

const referralMilestoneSchema = z
  .object({
    friendsRequired: z.number().positive('Friends required must be > 0'),
    rewardType: z.enum([
      'CASHBACK',
      'FREE_MEAL',
      'FREE_DELIVERY',
      'CREDIT',
      'OTHER',
    ]),
    rewardValue: z.number().nonnegative('Reward value must be >= 0'),
    minOrderAmountPerFriend: z
      .number()
      .nonnegative('Min order amount must be >= 0'),
    validityDays: z.number().nonnegative().optional(),
  })
  .strict();

const deliverySettingSchema = z
  .object({
    baseCharge: z.number().nonnegative(),
    chargePerKm: z.number().nonnegative(),
    vatRate: z.number().min(0).max(100),
  })
  .strict();
const ingredientsOrderSchema = z
  .object({
    deliveryChargeInsideLisbon: z.number().nonnegative(),
    deliveryChargeOutsideLisbon: z.number().nonnegative(),
  })
  .strict();

const commissionSettingSchema = z
  .object({
    platformPercent: z.number().min(0).max(100),
    platformVatRate: z.number().min(0).max(100),
    fleetManagerPercent: z.number().min(0).max(100),
    serviceCharge: z.number().min(0).max(100),
  })
  .strict();

const orderSettingSchema = z
  .object({
    nearestVendorRadiusKm: z.number().positive(),
    cancelTimeLimitMinutes: z.number().nonnegative(),
  })
  .strict();

const rewardSettingSchema = z
  .object({
    customerPointsPerEuro: z.number().nonnegative(),
    riderPointsPerDelivery: z.number().nonnegative(),
    referralPoints: z.number().nonnegative(),
    newRiderWelcomeBonus: z.number().nonnegative(),
    pointsExpiryDays: z.number().nonnegative(),
    customerReferralMilestones: z.array(referralMilestoneSchema),
  })
  .strict();

const payoutSettingSchema = z
  .object({
    autoGenerate: z.boolean(),
    payoutDays: z.array(
      z.enum([
        'Sunday',
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday',
      ]),
    ),
    minPayoutAmount: z.number().nonnegative(),
    payoutWindowDays: z.number().nonnegative(),
  })
  .strict();

// create global setting validation schema
const createGlobalSettingValidationSchema = z.object({
  body: z
    .object({
      delivery: deliverySettingSchema.optional(),
      ingredientsOrder: ingredientsOrderSchema.optional(),
      commission: commissionSettingSchema.optional(),
      order: orderSettingSchema.optional(),
      rewards: rewardSettingSchema.optional(),
      payout: payoutSettingSchema.optional(),
    })
    .strict(),
});

// update global setting validation schema
const updateGlobalSettingValidationSchema = z.object({
  body: z
    .object({
      delivery: deliverySettingSchema.partial().optional(),
      ingredientsOrder: ingredientsOrderSchema.partial().optional(),
      commission: commissionSettingSchema.partial().optional(),
      order: orderSettingSchema.partial().optional(),
      rewards: rewardSettingSchema.partial().optional(),
      payout: payoutSettingSchema.partial().optional(),
    })
    .strict(),
});

export const GlobalSettingValidation = {
  createGlobalSettingValidationSchema,
  updateGlobalSettingValidationSchema,
};
