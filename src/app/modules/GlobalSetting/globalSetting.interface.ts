import mongoose from 'mongoose';

export type TReferralMilestone = {
  friendsRequired: number;
  rewardType: 'CASHBACK' | 'FREE_MEAL' | 'FREE_DELIVERY' | 'CREDIT' | 'OTHER';
  rewardValue: number;
  minOrderAmountPerFriend: number;
  validityDays?: number;
};

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
    customerReferralMilestones: TReferralMilestone[];
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

  // Meta Data
  meta: {
    updatedBy: mongoose.Types.ObjectId;
  };
};
