import { Schema, model } from 'mongoose';
import { TGlobalSettings } from './globalSetting.interface';

const GlobalSettingsSchema = new Schema<TGlobalSettings>(
  {
    // --------------------------------------------------
    // Delivery Pricing
    // --------------------------------------------------
    deliveryChargePerKm: {
      type: Number,
      required: true,
      default: 0,
    },

    baseDeliveryCharge: {
      type: Number,
      default: 0,
    },

    minDeliveryCharge: {
      type: Number,
      default: 50,
    },

    maxDeliveryCharge: {
      type: Number,
      default: 300,
    },

    freeDeliveryAbove: {
      type: Number,
      default: 0,
    },

    maxDeliveryDistanceKm: {
      type: Number,
      default: 15,
    },

    // --------------------------------------------------
    // Platform Commission
    // --------------------------------------------------
    platformCommissionPercent: {
      type: Number,
      default: 15,
      min: 0,
      max: 100,
    },

    platformCommissionVatRate: {
      type: Number,
      default: 23,
      min: 0,
      max: 100,
    },

    fleetManagerCommissionPercent: {
      type: Number,
      default: 4,
      min: 0,
      max: 100,
    },

    deliveryPartnerCommissionPercent: {
      type: Number,
      default: 96,
      min: 0,
      max: 100,
    },

    deliveryVatRate: {
      type: Number,
      default: 23,
      min: 0,
      max: 100,
    },

    vendorVatPercent: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    // --------------------------------------------------
    // Order Rules
    // --------------------------------------------------
    minOrderAmount: {
      type: Number,
      default: 0,
    },

    maxOrderAmount: {
      type: Number,
      default: null,
    },

    maxItemsPerOrder: {
      type: Number,
      default: null,
    },

    // --------------------------------------------------
    // Cancellation & Refund
    // --------------------------------------------------
    cancelTimeLimitMinutes: {
      type: Number,
      default: 5,
    },

    refundProcessingDays: {
      type: Number,
      default: 7,
    },

    // --------------------------------------------------
    // Coupons & Offers
    // --------------------------------------------------
    isCouponEnabled: {
      type: Boolean,
      default: true,
    },

    isOfferEnabled: {
      type: Boolean,
      default: true,
    },

    maxDiscountPercent: {
      type: Number,
      default: 50,
      min: 0,
      max: 100,
    },

    // --------------------------------------------------
    // Order Automation
    // --------------------------------------------------
    autoCancelUnacceptedOrderMinutes: {
      type: Number,
      default: 10,
    },

    autoMarkDeliveredAfterMinutes: {
      type: Number,
      default: 180,
    },

    // --------------------------------------------------
    // OTP & Security
    // --------------------------------------------------
    orderOtpEnabled: {
      type: Boolean,
      default: true,
    },

    otpLength: {
      type: Number,
      default: 4,
    },

    otpExpiryMinutes: {
      type: Number,
      default: 5,
    },

    // --------------------------------------------------
    // Platform State
    // --------------------------------------------------
    isPlatformLive: {
      type: Boolean,
      default: true,
    },

    maintenanceMessage: {
      type: String,
      default: '',
    },

    // --------------------------------------------------
    // Meta
    // --------------------------------------------------
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'Admin',
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

GlobalSettingsSchema.index({}, { unique: true });

export const GlobalSettings = model<TGlobalSettings>(
  'GlobalSettings',
  GlobalSettingsSchema,
);
