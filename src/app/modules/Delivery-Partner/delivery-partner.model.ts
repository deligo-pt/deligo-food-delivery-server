/* eslint-disable no-useless-escape */
import { Schema, model } from 'mongoose';
import { TDeliveryPartner } from './delivery-partner.interface';
import { IUserModel } from '../../interfaces/user.interface';
import { userSchemaPlugin } from '../../plugins/passwordPlugin';
import { USER_STATUS } from '../../constant/user.constant';
import { currentStatusOptions } from './delivery-partner.constant';
import { liveLocationSchema } from '../../constant/GlobalModel/global.model';

const deliveryPartnerSchema = new Schema<
  TDeliveryPartner,
  IUserModel<TDeliveryPartner>
>(
  {
    // -------------------------------------------------
    // Core Identifiers & Credentials
    // -------------------------------------------------
    authUserId: {
      type: String,
      required: true,
      unique: true,
    },
    customUserId: {
      type: String,
      required: true,
      unique: true,
    },
    role: {
      type: String,
      enum: ['DELIVERY_PARTNER'],
      required: true,
      default: 'DELIVERY_PARTNER',
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^([\w-\.]+@([\w-]+\.)+[\w-]{2,4})?$/,
        'Please fill a valid email address',
      ],
    },
    status: {
      type: String,
      enum: Object.keys(USER_STATUS),
      required: true,
    },
    isUpdateLocked: {
      type: Boolean,
      default: false,
    },
    isDeleted: { type: Boolean, default: false },

    // Name
    name: {
      firstName: { type: String },
      lastName: { type: String },
    },
    contactNumber: { type: String },

    // -------------------------------------------------
    // Live Location
    // -------------------------------------------------
    currentSessionLocation: {
      type: liveLocationSchema,
    },

    personalInfo: {
      dateOfBirth: { type: Date },
      gender: { type: String, enum: ['MALE', 'FEMALE', 'OTHER'] },
      nationality: { type: String, default: '' },
      NIF: { type: String, default: '' },
      passportNumber: { type: String, default: '' },
    },

    // ------------------------------------------------------
    // Referral
    // ------------------------------------------------------
    referralCode: { type: String },
    referredBy: {
      type: Schema.Types.ObjectId,
      ref: 'DeliveryPartner',
      default: null,
    },

    //-------------------------------------------------
    // Legal Status
    //-------------------------------------------------
    legalStatus: {
      residencePermitType: { type: String, default: '' },
      residencePermitNumber: { type: String, default: '' },
      residencePermitExpiry: { type: Date },
    },

    // -------------------------------------------------
    // Payment & Banking Details
    // -------------------------------------------------
    bankDetails: {
      bankName: { type: String, default: '' },
      accountHolderName: { type: String, default: '' },
      accountNumber: { type: String, default: '' },
      iban: { type: String, default: '' },
      swiftCode: { type: String, default: '' },
    },

    // -------------------------------------------------
    // Vehicle Information
    // -------------------------------------------------
    vehicleInfo: {
      vehicleType: {
        type: String,
        enum: ['BICYCLE', 'E-BIKE', 'SCOOTER', 'MOTORBIKE', 'CAR'],
      },
      brand: { type: String, default: '' },
      model: { type: String, default: '' },
      licensePlate: { type: String, default: '' },
      drivingLicenseNumber: { type: String, default: '' },
      drivingLicenseExpiry: { type: Date },
      insurancePolicyNumber: { type: String, default: '' },
      insuranceExpiry: { type: Date },
    },

    // -------------------------------------------------
    // Criminal Background
    // -------------------------------------------------
    criminalRecord: {
      certificate: { type: Boolean },
      issueDate: { type: Date },
      expiryDate: { type: Date },
    },

    // -------------------------------------------------
    // Work Preferences & Equipment
    // -------------------------------------------------
    workPreferences: {
      preferredZones: { type: [String], default: [] },
      preferredHours: { type: [String], default: [] },
      hasEquipment: {
        isothermalBag: { type: Boolean, default: false },
        helmet: { type: Boolean, default: false },
        powerBank: { type: Boolean, default: false },
      },
      workedWithOtherPlatform: { type: Boolean, default: false },
      otherPlatformName: { type: String, default: '' },
    },

    // -------------------------------------------------
    // Operational Statistics
    // -------------------------------------------------
    operationalData: {
      totalDeliveries: { type: Number, default: 0 },
      completedDeliveries: { type: Number, default: 0 },
      canceledDeliveries: { type: Number, default: 0 },

      totalOfferedOrders: { type: Number, default: 0 },
      totalAcceptedOrders: { type: Number, default: 0 },
      totalRejectedOrders: { type: Number, default: 0 },
      totalDeliveryMinutes: { type: Number, default: 0 },

      currentStatus: {
        type: String,
        enum: Object.keys(currentStatusOptions),
        default: 'OFFLINE',
        required: true,
      },
      assignmentZoneId: {
        type: Schema.Types.ObjectId,
        ref: 'Zone',
        default: null,
      },
      currentZoneId: {
        type: Schema.Types.ObjectId,
        ref: 'Zone',
        default: null,
      },
      currentOrderId: {
        type: Schema.Types.ObjectId,
        ref: 'Order',
        default: null,
      },
      capacity: { type: Number, required: true, default: 1 },
      isWorking: { type: Boolean, default: false },
      lastActivityAt: { type: Date },
    },

    // -------------------------------------------------
    // Rating
    // -------------------------------------------------
    rating: {
      average: { type: Number, default: 0 },
      totalReviews: { type: Number, default: 0 },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    versionKey: false,
  },
);

// --- Indexing and Plugins ---
deliveryPartnerSchema.index({ currentSessionLocation: '2dsphere' });

deliveryPartnerSchema.plugin(userSchemaPlugin);

export const DeliveryPartner = model<
  TDeliveryPartner,
  IUserModel<TDeliveryPartner>
>('DeliveryPartner', deliveryPartnerSchema);
