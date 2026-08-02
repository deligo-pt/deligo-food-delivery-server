import z from 'zod';

const referralMilestoneSchema = z
  .object({
    friendsRequired: z
      .number({ required_error: 'Friends required is required' })
      .positive('Friends required must be greater than 0'),
    rewardType: z.enum(
      ['CASHBACK', 'FREE_MEAL', 'FREE_DELIVERY', 'CREDIT', 'OTHER'],
      { required_error: 'Reward type is required' },
    ),
    rewardValue: z
      .number({ required_error: 'Reward value is required' })
      .nonnegative('Reward value must be a non-negative number'),
    minOrderAmountPerFriend: z
      .number({ required_error: 'Minimum order amount per friend is required' })
      .nonnegative('Minimum order amount per friend must be a non-negative number'),
    validityDays: z
      .number()
      .nonnegative('Validity days must be a non-negative number')
      .optional(),
  })
  .strict();

const deliverySettingSchema = z
  .object({
    baseCharge: z
      .number({ required_error: 'Base charge is required' })
      .nonnegative('Base charge must be a non-negative number'),
    chargePerKm: z
      .number({ required_error: 'Charge per km is required' })
      .nonnegative('Charge per km must be a non-negative number'),
    vatRate: z
      .number({ required_error: 'VAT rate is required' })
      .min(0, 'VAT rate must be at least 0')
      .max(100, 'VAT rate cannot exceed 100'),
  })
  .strict();
const ingredientsOrderSchema = z
  .object({
    deliveryChargeInsideLisbon: z
      .number({ required_error: 'Delivery charge inside Lisbon is required' })
      .nonnegative('Delivery charge inside Lisbon must be a non-negative number'),
    deliveryChargeOutsideLisbon: z
      .number({ required_error: 'Delivery charge outside Lisbon is required' })
      .nonnegative('Delivery charge outside Lisbon must be a non-negative number'),
  })
  .strict();

const commissionSettingSchema = z
  .object({
    platformPercent: z
      .number({ required_error: 'Platform percent is required' })
      .min(0, 'Platform percent must be at least 0')
      .max(100, 'Platform percent cannot exceed 100'),
    platformVatRate: z
      .number({ required_error: 'Platform VAT rate is required' })
      .min(0, 'Platform VAT rate must be at least 0')
      .max(100, 'Platform VAT rate cannot exceed 100'),
    fleetManagerPercent: z
      .number({ required_error: 'Fleet manager percent is required' })
      .min(0, 'Fleet manager percent must be at least 0')
      .max(100, 'Fleet manager percent cannot exceed 100'),
    serviceCharge: z
      .number({ required_error: 'Service charge is required' })
      .min(0, 'Service charge must be at least 0')
      .max(100, 'Service charge cannot exceed 100'),
  })
  .strict();

const orderSettingSchema = z
  .object({
    nearestVendorRadiusKm: z
      .number({ required_error: 'Nearest vendor radius (km) is required' })
      .positive('Nearest vendor radius (km) must be greater than 0'),
    cancelTimeLimitMinutes: z
      .number({ required_error: 'Cancel time limit (minutes) is required' })
      .nonnegative('Cancel time limit (minutes) must be a non-negative number'),
  })
  .strict();

const rewardSettingSchema = z
  .object({
    customerPointsPerEuro: z
      .number({ required_error: 'Customer points per euro is required' })
      .nonnegative('Customer points per euro must be a non-negative number'),
    riderPointsPerDelivery: z
      .number({ required_error: 'Rider points per delivery is required' })
      .nonnegative('Rider points per delivery must be a non-negative number'),
    referralPoints: z
      .number({ required_error: 'Referral points is required' })
      .nonnegative('Referral points must be a non-negative number'),
    newRiderWelcomeBonus: z
      .number({ required_error: 'New rider welcome bonus is required' })
      .nonnegative('New rider welcome bonus must be a non-negative number'),
    pointsExpiryDays: z
      .number({ required_error: 'Points expiry days is required' })
      .nonnegative('Points expiry days must be a non-negative number'),
    customerReferralMilestones: z.array(referralMilestoneSchema, {
      required_error: 'Customer referral milestones are required',
    }),
  })
  .strict();

const payoutSettingSchema = z
  .object({
    autoGenerate: z.boolean({ required_error: 'Auto generate is required' }),
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
      { required_error: 'Payout days are required' },
    ),
    minPayoutAmount: z
      .number({ required_error: 'Minimum payout amount is required' })
      .nonnegative('Minimum payout amount must be a non-negative number'),
    payoutWindowDays: z
      .number({ required_error: 'Payout window (days) is required' })
      .nonnegative('Payout window (days) must be a non-negative number'),
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
