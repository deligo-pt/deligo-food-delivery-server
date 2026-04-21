import mongoose from 'mongoose';

export type TGlobalSettings = {
  // --------------------------------------------------
  // Delivery Pricing
  // --------------------------------------------------

  delivery: {
    baseCharge: number;
    ChargePerKm: number;
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
    riderReferralPoints: number;
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

  // Meta Data
  meta: {
    updatedBy: mongoose.Types.ObjectId;
    createdAt?: Date;
    updatedAt?: Date;
  };
};

// export type TGlobalSettings = {
//   // Delivery pricing
//   deliveryChargePerKm: number;
//   baseDeliveryCharge: number;
//   minDeliveryCharge: number;
//   maxDeliveryCharge?: number;
//   freeDeliveryAbove?: number;
//   maxDeliveryDistanceKm?: number;

//   // Platform commission
//   platformCommissionPercent: number;
//   platformCommissionVatRate: number;
//   fleetManagerCommissionPercent?: number;
//   deliveryPartnerCommissionPercent?: number;
//   deliveryVatRate?: number;
//   vendorVatPercent?: number;

//   // customer nearest vendor search radius
//   customerNearestVendorRadiusKm: number;

//   // Order rules
//   minOrderAmount?: number;
//   maxOrderAmount?: number;
//   maxItemsPerOrder?: number;

//   // Cancellation & refund
//   cancelTimeLimitMinutes?: number;
//   refundProcessingDays?: number;

//   // Offers
//   isOfferEnabled: boolean;
//   maxDiscountPercent?: number;

//   // Order lifecycle automation
//   autoCancelUnacceptedOrderMinutes?: number;
//   autoMarkDeliveredAfterMinutes?: number;

//   // OTP & security
//   orderOtpEnabled: boolean;
//   otpLength?: number;
//   otpExpiryMinutes?: number;

//   // Platform state
//   isPlatformLive: boolean;
//   maintenanceMessage?: string;

//   // Meta
//   updatedBy?: string;
//   createdAt?: Date;
//   updatedAt?: Date;
// };
