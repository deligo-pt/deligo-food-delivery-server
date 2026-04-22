import { Schema, model } from 'mongoose';
import { TGlobalSettings } from './globalSetting.interface';

const GlobalSettingsSchema = new Schema<TGlobalSettings>({
  // --------------------------------------------------
  // Delivery Pricing
  // --------------------------------------------------
  delivery: {
    baseCharge: {
      type: Number,
      required: true,
      default: 0,
    },
    chargePerKm: {
      type: Number,
      required: true,
      default: 0,
    },
    minCharge: {
      type: Number,
      required: true,
      default: 0,
    },
    maxCharge: {
      type: Number,
      required: true,
      default: 0,
    },
    freeAbove: {
      type: Number,
      required: true,
      default: 0,
    },
    maxDistanceKm: {
      type: Number,
      required: true,
      default: 0,
    },
    vatRate: {
      type: Number,
      required: true,
      default: 0,
    },
  },
  // --------------------------------------------------
  // Commission & VAT
  // --------------------------------------------------
  commission: {
    platformPercent: {
      type: Number,
      required: true,
      default: 0,
    },
    platformVatRate: {
      type: Number,
      required: true,
      default: 0,
    },
    fleetManagerPercent: {
      type: Number,
      required: true,
      default: 0,
    },
    deliveryPartnerPercent: {
      type: Number,
      required: true,
      default: 0,
    },
    vendorVatPercent: {
      type: Number,
      required: true,
      default: 0,
    },
  },

  // --------------------------------------------------
  // Order Rules & Automation
  // --------------------------------------------------
  order: {
    minAmount: {
      type: Number,
      default: 0,
    },
    maxAmount: {
      type: Number,
      default: 0,
    },
    maxItemsPerOrder: {
      type: Number,
      default: 0,
    },
    nearestVendorRadiusKm: {
      type: Number,
      default: 0,
    },
    autoCancelUnacceptedMinutes: {
      type: Number,
      default: 0,
    },
    autoMarkDeliveredMinutes: {
      type: Number,
      default: 0,
    },
    cancelTimeLimitMinutes: {
      type: Number,
      default: 0,
    },
    refundProcessingDays: {
      type: Number,
      default: 0,
    },
  },
  rewards: {
    customerPointsPerEuro: {
      type: Number,
      default: 0,
    },
    riderPointsPerDelivery: {
      type: Number,
      default: 0,
    },
    referralPoints: {
      type: Number,
      default: 0,
    },
    newRiderWelcomeBonus: {
      type: Number,
      default: 0,
    },
    pointsExpiryDays: {
      type: Number,
      default: 0,
    },
    customerReferralMilestones: {
      type: Array,
      default: [],
    },
  },

  system: {
    isPlatformLive: {
      type: Boolean,
      default: true,
    },
    maintenanceMessage: {
      type: String,
      default: '',
    },
    isOfferEnabled: {
      type: Boolean,
      default: false,
    },
    maxDiscountPercent: {
      type: Number,
      default: 0,
    },
    refundProcessingDays: {
      type: Number,
      default: 0,
    },
    otp: {
      enabled: {
        type: Boolean,
        default: false,
      },
      length: {
        type: Number,
        default: 4,
      },
      expiryMinutes: {
        type: Number,
        default: 0,
      },
    },
  },

  meta: {
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'Admin',
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
});

GlobalSettingsSchema.index({}, { unique: true });

export const GlobalSettings = model<TGlobalSettings>(
  'GlobalSettings',
  GlobalSettingsSchema,
);
