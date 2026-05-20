/* eslint-disable no-useless-escape */
import { Schema, model } from 'mongoose';
import { TFleetManager } from './fleet-manager.interface';
import { USER_STATUS } from '../../constant/GlobalConstant/user.constant';
import { loginDeviceSchema } from '../../constant/GlobalModel/user.model';
import { liveLocationSchema } from '../../constant/GlobalModel/location.model';
import { authLookupPlugin } from '../../plugins/authLookupPlugin';
import { IAuthLookupModel } from '../../interfaces/user.interface';

const fleetManagerSchema = new Schema<
  TFleetManager,
  IAuthLookupModel<TFleetManager>
>(
  {
    // ------------------------------------------
    // Core Identifiers
    // ------------------------------------------
    userId: {
      type: String,
      required: true,
      unique: true,
    },

    registeredBy: {
      type: Schema.Types.ObjectId,
      default: null,
      ref: 'Admin',
    },

    role: {
      type: String,
      enum: ['FLEET_MANAGER'],
      required: true,
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
      default: USER_STATUS.PENDING,
    },

    isEmailVerified: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
    isUpdateLocked: { type: Boolean, default: false },

    // --------------------------------------------------------
    // Pending temporary Email and contact number
    // --------------------------------------------------------
    pendingEmail: { type: String },
    pendingContactNumber: { type: String },

    // ------------------------------------------
    // OTP & Password Reset
    // ------------------------------------------
    otp: { type: String, default: '' },
    isOtpExpired: { type: Date, default: null },

    passwordResetToken: { type: String, default: '' },
    passwordResetTokenExpiresAt: { type: Date, default: null },
    passwordChangedAt: { type: Date, default: null },

    // ------------------------------------------
    // Personal Details
    // ------------------------------------------
    name: {
      firstName: { type: String, default: '' },
      lastName: { type: String, default: '' },
    },

    contactNumber: { type: String, default: '' },
    profilePhoto: { type: String, default: '' },

    address: {
      street: { type: String, default: '' },
      city: { type: String, default: '' },
      state: { type: String, default: '' },
      country: { type: String, default: '' },
      postalCode: { type: String, default: '' },
      longitude: { type: Number },
      latitude: { type: Number },
      geoAccuracy: { type: Number },
      detailedAddress: { type: String, default: '' },
    },

    currentSessionLocation: {
      type: liveLocationSchema,
    },

    // ------------------------------------------
    // Business Details
    // ------------------------------------------
    businessDetails: {
      businessName: { type: String, default: '' },
      businessLicenseNumber: { type: String, default: '' },
      NIF: { type: String, default: '' },
      totalBranches: { type: Number, default: 1 },
    },

    businessLocation: {
      street: { type: String, default: '' },
      city: { type: String, default: '' },
      state: { type: String, default: '' },
      country: { type: String, default: '' },
      postalCode: { type: String, default: '' },
      longitude: { type: Number },
      latitude: { type: Number },
      geoAccuracy: { type: Number },
    },

    // ------------------------------------------
    // Bank Details
    // ------------------------------------------
    bankDetails: {
      bankName: { type: String, default: '' },
      accountHolderName: { type: String, default: '' },
      iban: { type: String, default: '' },
      swiftCode: { type: String, default: '' },
    },

    // ------------------------------------------
    // Documents
    // ------------------------------------------
    documents: {
      myPhoto: { type: [String], default: [] },
      idProofFront: { type: [String], default: [] },
      idProofBack: { type: [String], default: [] },
      businessLicense: { type: [String], default: [] },
    },

    // ------------------------------------------
    // Operational Data
    // ------------------------------------------
    operationalData: {
      totalDrivers: { type: Number, default: 0 },
      activeVehicles: { type: Number, default: 0 },
      totalDeliveries: { type: Number, default: 0 },
    },

    // ------------------------------------------
    // Security & Access
    // ------------------------------------------
    twoFactorEnabled: { type: Boolean, default: false },

    loginDevices: {
      type: [loginDeviceSchema],
      default: [],
    },

    // ------------------------------------------
    // Admin Workflow / Audit
    // ------------------------------------------
    approvedBy: { type: Schema.Types.ObjectId, default: null, ref: 'Admin' },
    rejectedBy: { type: Schema.Types.ObjectId, default: null, ref: 'Admin' },
    blockedBy: { type: Schema.Types.ObjectId, default: null, ref: 'Admin' },

    submittedForApprovalAt: { type: Date, default: null },
    approvedOrRejectedOrBlockedAt: { type: Date, default: null },

    remarks: { type: String, default: '' },

    rating: {
      average: { type: Number, default: 0 },
      totalReviews: { type: Number, default: 0 },
    },
  },
  {
    timestamps: true,
    virtuals: true,
  },
);

fleetManagerSchema.plugin(authLookupPlugin);

export const FleetManager = model<
  TFleetManager,
  IAuthLookupModel<TFleetManager>
>('FleetManager', fleetManagerSchema);
