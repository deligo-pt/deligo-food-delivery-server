import mongoose from 'mongoose';

export type TGlobalSettings = {
  // --------------------------------------------------
  // Delivery Pricing
  // --------------------------------------------------

  delivery: {
    baseCharge: number;
    chargePerKm: number;
    minCharge: number;
    maxCharge: number;
    freeAbove: number;
    maxDistanceKm: number;
    vatRate: number;
  };

  // --------------------------------------------------
  // Commission & VAT
  // --------------------------------------------------
  commission: {
    platformPercent: number;
    platformVatRate: number;
    fleetManagerPercent: number;
    deliveryPartnerPercent: number;
    vendorVatPercent: number;
  };

  // Order Rules & Automation
  order: {
    minAmount: number;
    maxAmount: number;
    maxItemsPerOrder: number;
    nearestVendorRadiusKm: number;
    autoCancelUnacceptedMinutes: number;
    autoMarkDeliveredMinutes: number;
    cancelTimeLimitMinutes: number;
  };

  // Loyalty & Rewards
  rewards: {
    customerPointsPerEuro: number;
    riderPointsPerDelivery: number;
    referralPoints: number;
    newRiderWelcomeBonus: number;
    pointsExpiryDays: number;
    customerReferralMilestones: {
      friendsRequired: number;
      rewardType: 'CASHBACK' | 'FREE_MEAL' | 'FREE_DELIVERY' | 'CREDIT';
      rewardValue: number;
      minOrderAmountPerFriend: number;
    }[];
  };

  // Security & System State
  system: {
    isPlatformLive: boolean;
    maintenanceMessage: string;
    isOfferEnabled: boolean;
    maxDiscountPercent: number;
    refundProcessingDays: number;
    otp: {
      enabled: boolean;
      length?: number;
      expiryMinutes: number;
    };
  };

  // --------------------------------------------------
  // Payout & Settlement Rules
  // --------------------------------------------------
  payout: {
    /**
     * If true, the system will automatically generate pending payout records
     * based on the defined schedule.
     */
    autoGenerate: boolean;

    /**
     * Specific days of the week when payouts should be triggered.
     * Example: ['Tuesday', 'Friday']
     */
    payoutDays: (
      | 'Sunday'
      | 'Monday'
      | 'Tuesday'
      | 'Wednesday'
      | 'Thursday'
      | 'Friday'
      | 'Saturday'
    )[];

    /**
     * The minimum accumulated unpaid earnings required to generate a payout record.
     */
    minPayoutAmount: number;

    /**
     * Defines how many days before the payout day the transaction window closes.
     * Example: If set to 1, a Tuesday payout will only include earnings up to Monday.
     */
    payoutWindowDays: number;
  };

  // Meta Data
  meta: {
    updatedBy: mongoose.Types.ObjectId;
  };
  createdAt?: Date;
  updatedAt?: Date;
};
