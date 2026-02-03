export type TGlobalSettings = {
  // Delivery pricing
  deliveryChargePerKm: number;
  baseDeliveryCharge: number;
  minDeliveryCharge: number;
  maxDeliveryCharge?: number;
  freeDeliveryAbove?: number;
  maxDeliveryDistanceKm?: number;

  // Platform commission
  platformCommissionPercent: number;
  platformCommissionVatRate: number;
  fleetManagerCommissionPercent?: number;
  deliveryPartnerCommissionPercent?: number;
  deliveryVatRate?: number;
  vendorVatPercent?: number;

  // Order rules
  minOrderAmount?: number;
  maxOrderAmount?: number;
  maxItemsPerOrder?: number;

  // Cancellation & refund
  cancelTimeLimitMinutes?: number;
  refundProcessingDays?: number;

  // Offers
  isOfferEnabled: boolean;
  maxDiscountPercent?: number;

  // Order lifecycle automation
  autoCancelUnacceptedOrderMinutes?: number;
  autoMarkDeliveredAfterMinutes?: number;

  // OTP & security
  orderOtpEnabled: boolean;
  otpLength?: number;
  otpExpiryMinutes?: number;

  // Platform state
  isPlatformLive: boolean;
  maintenanceMessage?: string;

  // Meta
  updatedBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
};
