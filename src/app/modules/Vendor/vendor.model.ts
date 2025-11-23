/* eslint-disable no-useless-escape */
import { Schema, model } from 'mongoose';
import { TVendor } from './vendor.interface';
import { IUserModel } from '../../interfaces/user.interface';
import { loginDeviceSchema, USER_STATUS } from '../../constant/user.constant';
import { passwordPlugin } from '../../plugins/passwordPlugin';

const vendorSchema = new Schema<TVendor, IUserModel<TVendor>>(
  {
    // -------------------------------------------------------
    // Core Identifiers
    // -------------------------------------------------------
    userId: {
      type: String,
      required: true,
      unique: true,
    },

    role: {
      type: String,
      enum: ['VENDOR'],
      required: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^([\w-\.]+@([\w-]+\.)+[\w-]{2,4})$/,
        'Please enter a valid email address',
      ],
    },

    password: {
      type: String,
      required: true,
      select: false,
    },

    status: {
      type: String,
      enum: Object.keys(USER_STATUS),
      default: USER_STATUS.PENDING,
    },

    isEmailVerified: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },

    // -------------------------------------------------------
    // Rating & Activity
    // -------------------------------------------------------
    rating: {
      average: { type: Number, default: 0 },
      totalReviews: { type: Number, default: 0 },
    },

    totalOrders: { type: Number, default: 0 },
    lastLoginAt: { type: Date, default: null },

    // Push Notifications
    fcmTokens: { type: [String], default: [] },

    // ──────────────────────────────────────────────
    // OTP & Password Reset
    // -------------------------------------------------------
    otp: { type: String, default: '' },
    isOtpExpired: { type: Date, default: null },

    passwordResetToken: { type: String, default: '' },
    passwordResetTokenExpiresAt: { type: Date, default: null },

    // -------------------------------------------------------
    // Personal Details
    // -------------------------------------------------------
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
      latitude: { type: Number },
      longitude: { type: Number },
      geoAccuracy: { type: Number },
    },

    passwordChangedAt: { type: Date, default: null },

    // -------------------------------------------------------
    // Business Details
    // -------------------------------------------------------
    businessDetails: {
      businessName: { type: String, default: '' },
      businessType: { type: String, default: '' },
      businessLicenseNumber: { type: String, default: '' },
      NIF: { type: String, default: '' },
      totalBranches: { type: Number, default: 1 },

      openingHours: { type: String, default: '' },
      closingHours: { type: String, default: '' },
      closingDays: { type: [String], default: [] },
    },

    // -------------------------------------------------------
    // Business Location
    // -------------------------------------------------------
    businessLocation: {
      street: { type: String, default: '' },
      city: { type: String, default: '' },
      state: { type: String, default: '' },
      country: { type: String, default: '' },
      postalCode: { type: String, default: '' },
      latitude: { type: Number },
      longitude: { type: Number },
      geoAccuracy: { type: Number },
    },

    // -------------------------------------------------------
    // Bank Details
    // -------------------------------------------------------
    bankDetails: {
      bankName: { type: String, default: '' },
      accountHolderName: { type: String, default: '' },
      iban: { type: String, default: '' },
      swiftCode: { type: String, default: '' },
    },

    // -------------------------------------------------------
    // Documents
    // -------------------------------------------------------
    documents: {
      businessLicenseDoc: { type: String, default: '' },
      taxDoc: { type: String, default: '' },
      idProof: { type: String, default: '' },
      storePhoto: { type: String, default: '' },
      menuUpload: { type: String, default: '' },
    },

    // -------------------------------------------------------
    // Security & Access
    // -------------------------------------------------------
    twoFactorEnabled: { type: Boolean, default: false },

    loginDevices: {
      type: [loginDeviceSchema],
      default: [],
    },

    // -------------------------------------------------------
    // Admin Workflow / Audit
    // -------------------------------------------------------
    approvedBy: { type: String, default: '' },
    rejectedBy: { type: String, default: '' },
    blockedBy: { type: String, default: '' },

    submittedForApprovalAt: { type: Date, default: null },
    approvedOrRejectedOrBlockedAt: { type: Date, default: null },

    remarks: { type: String, default: '' },
  },
  {
    timestamps: true,
    virtuals: true,
  }
);

vendorSchema.plugin(passwordPlugin);

export const Vendor = model<TVendor, IUserModel<TVendor>>(
  'Vendor',
  vendorSchema
);
