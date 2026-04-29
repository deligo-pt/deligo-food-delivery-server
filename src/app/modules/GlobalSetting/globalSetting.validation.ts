import z from 'zod';

const referralMilestoneSchema = z.object({
  friendsRequired: z.number().positive('Friends required must be > 0'),
  rewardType: z.enum(['CASHBACK', 'FREE_MEAL', 'FREE_DELIVERY', 'CREDIT']),
  rewardValue: z.number().nonnegative('Reward value must be >= 0'),
  minOrderAmountPerFriend: z
    .number()
    .nonnegative('Min order amount must be >= 0'),
});

const deliverySettingSchema = z.object({
  baseCharge: z.number().nonnegative(),
  chargePerKm: z.number().nonnegative(),
  minCharge: z.number().nonnegative(),
  maxCharge: z.number().nonnegative(),
  freeAbove: z.number().nonnegative(),
  maxDistanceKm: z.number().nonnegative(),
  vatRate: z.number().min(0).max(100),
});

const commissionSettingSchema = z.object({
  platformPercent: z.number().min(0).max(100),
  platformVatRate: z.number().min(0).max(100),
  fleetManagerPercent: z.number().min(0).max(100),
  deliveryPartnerPercent: z.number().min(0).max(100),
  vendorVatPercent: z.number().min(0).max(100),
});

const orderSettingSchema = z.object({
  minAmount: z.number().nonnegative(),
  maxAmount: z.number().nonnegative(),
  maxItemsPerOrder: z.number().positive(),
  nearestVendorRadiusKm: z.number().positive(),
  autoCancelUnacceptedMinutes: z.number().nonnegative(),
  autoMarkDeliveredMinutes: z.number().nonnegative(),
  cancelTimeLimitMinutes: z.number().nonnegative(),
});

const rewardSettingSchema = z.object({
  customerPointsPerEuro: z.number().nonnegative(),
  riderPointsPerDelivery: z.number().nonnegative(),
  referralPoints: z.number().nonnegative(),
  newRiderWelcomeBonus: z.number().nonnegative(),
  pointsExpiryDays: z.number().nonnegative(),
  customerReferralMilestones: z.array(referralMilestoneSchema),
});

const systemSettingSchema = z.object({
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
});

const payoutSettingSchema = z.object({
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
});

// create global setting validation schema
const createGlobalSettingValidationSchema = z.object({
  body: z.object({
    delivery: deliverySettingSchema.optional(),
    commission: commissionSettingSchema.optional(),
    order: orderSettingSchema.optional(),
    rewards: rewardSettingSchema.optional(),
    system: systemSettingSchema.optional(),
    payout: payoutSettingSchema.optional(),
  }),
});

// update global setting validation schema
const updateGlobalSettingValidationSchema = z.object({
  body: z.object({
    delivery: deliverySettingSchema.partial().optional(),
    commission: commissionSettingSchema.partial().optional(),
    order: orderSettingSchema.partial().optional(),
    rewards: rewardSettingSchema.partial().optional(),
    system: systemSettingSchema.partial().optional(),
    payout: payoutSettingSchema.partial().optional(),
  }),
});

export const GlobalSettingValidation = {
  createGlobalSettingValidationSchema,
  updateGlobalSettingValidationSchema,
};
