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
      unique: true
    },
    customUserId: {
      type: String,
      required: true,
      unique: true
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

    // -------------------------------------------------
    // Live Location
    // -------------------------------------------------
    currentSessionLocation: {
      type: liveLocationSchema,
      required: true
    },

    personalInfo: {
      dateOfBirth: { type: Date },
      gender: { type: String, enum: ['MALE', 'FEMALE', 'OTHER'] },
      nationality: { type: String },
      NIF: { type: String },
      passportNumber: { type: String },
    },

    // -------------------------------------------------
    // Legal Status / Work Rights
    // -------------------------------------------------
    legalStatus: {
      residencePermitType: { type: String },
      residencePermitNumber: { type: String },
      residencePermitExpiry: { type: Date },
    },

    // -------------------------------------------------
    // Payment & Banking Details
    // -------------------------------------------------
    bankDetails: {
      bankName: { type: String },
      accountHolderName: { type: String },
      iban: { type: String },
      swiftCode: { type: String },
    },

    // -------------------------------------------------
    // Vehicle Information
    // -------------------------------------------------
    vehicleInfo: {
      vehicleType: {
        type: String,
        enum: ['BICYCLE', 'E-BIKE', 'SCOOTER', 'MOTORBIKE', 'CAR'],
      },
      brand: { type: String },
      model: { type: String },
      licensePlate: { type: String },
      drivingLicenseNumber: { type: String },
      drivingLicenseExpiry: { type: Date },
      insurancePolicyNumber: { type: String },
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
      otherPlatformName: { type: String },
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
        required: true,
      },
      assignmentZoneId: {
        type: Schema.Types.ObjectId,
        ref: 'Zone',
        required: true
      },
      currentZoneId: { type: Schema.Types.ObjectId, ref: 'Zone' },
      currentOrderId: { type: Schema.Types.ObjectId, ref: 'Order' },
      capacity: { type: Number, required: true, default: 1 },
      isWorking: { type: Boolean, default: false, required: true },
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


export const DeliveryPartner = model<TDeliveryPartner, IUserModel<TDeliveryPartner>>('DeliveryPartner', deliveryPartnerSchema);