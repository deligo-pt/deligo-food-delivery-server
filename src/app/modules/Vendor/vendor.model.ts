/* eslint-disable no-useless-escape */
import { Schema, model } from 'mongoose';
import { TVendor } from './vendor.interface';
import { IUserModel } from '../../interfaces/user.interface';
import { loginDeviceSchema, USER_STATUS } from '../../constant/user.constant';
import { passwordPlugin } from '../../plugins/passwordPlugin';
import { liveLocationSchema } from '../../constant/GlobalModel/global.model';

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
    registeredBy: {
      id: {
        type: Schema.Types.ObjectId,
        refPath: 'registeredBy.model',
        default: null,
      },
      model: {
        type: String,
        enum: ['Admin', 'Vendor'],
        default: null,
      },
      role: {
        type: String,
        enum: ['ADMIN', 'SUPER_ADMIN', 'VENDOR'],
        default: null,
      },
    },
    role: {
      type: String,
      enum: ['VENDOR', 'SUB_VENDOR'],
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
    isUpdateLocked: { type: Boolean, default: false },

    // -------------------------------------------------------
    // Save fcm tokens
    // -------------------------------------------------------
    fcmTokens: { type: [String], default: [] },

    // --------------------------------------------------------
    // Pending temporary Email and contact number
    // --------------------------------------------------------
    pendingEmail: { type: String },
    pendingContactNumber: { type: String },

    // -------------------------------------------------------
    // OTP & Password Reset (UNCHANGED)
    // -------------------------------------------------------
    otp: { type: String, default: '' },
    isOtpExpired: { type: Date, default: null },
    passwordResetToken: { type: String, default: '' },
    passwordResetTokenExpiresAt: { type: Date, default: null },
    passwordChangedAt: { type: Date, default: null },

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
      longitude: { type: Number },
      latitude: { type: Number },
      geoAccuracy: { type: Number },
      detailedAddress: { type: String, default: '' },
    },

    // -------------------------------------------------------
    // Business Details
    // -------------------------------------------------------
    businessDetails: {
      businessName: { type: String, default: '' },
      businessType: { type: String, default: '' },
      businessLicenseNumber: { type: String, default: '' },
      NIF: { type: String, default: '' },
      totalBranches: { type: Number, default: 1 },

      // Existing Timing Fields
      openingHours: { type: String, default: '' },
      closingHours: { type: String, default: '' },
      closingDays: { type: [String], default: [] },

      // Operational Status
      isStoreOpen: { type: Boolean, default: true },
      storeClosedAt: { type: Date, default: null },

      // Association (Crucial for pricing/assignment)
      deliveryZoneId: { type: String, default: '' },

      // Timing details
      preparationTimeMinutes: { type: Number, default: 15 },
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
      longitude: { type: Number },
      latitude: { type: Number },
      geoAccuracy: { type: Number },
    },

    currentSessionLocation: {
      type: liveLocationSchema,
    },

    // -------------------------------------------------------
    // Bank Details & payment information
    // -------------------------------------------------------
    bankDetails: {
      bankName: { type: String, default: '' },
      accountHolderName: { type: String, default: '' },
      iban: { type: String, default: '' },
      swiftCode: { type: String, default: '' },
    },

    // -------------------------------------------------------
    // Documents * verification
    // -------------------------------------------------------
    documents: {
      businessLicenseDoc: { type: String, default: '' },
      taxDoc: { type: String, default: '' },
      idProofFront: { type: String, default: '' },
      idProofBack: { type: String, default: '' },
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
    // Rating & Activity
    // -------------------------------------------------------
    rating: {
      average: { type: Number, default: 0 },
      totalReviews: { type: Number, default: 0 },
    },
    totalOrders: { type: Number, default: 0 },
    lastLoginAt: { type: Date, default: null },

    // -------------------------------------------------------
    // Admin Workflow / Audit
    // -------------------------------------------------------
    approvedBy: { type: Schema.Types.ObjectId, default: null, ref: 'Admin' },
    rejectedBy: { type: Schema.Types.ObjectId, default: null, ref: 'Admin' },
    blockedBy: { type: Schema.Types.ObjectId, default: null, ref: 'Admin' },
    submittedForApprovalAt: { type: Date, default: null },
    approvedOrRejectedOrBlockedAt: { type: Date, default: null },
    remarks: { type: String, default: '' },
  },
  {
    timestamps: true,
    virtuals: true,
  },
);

vendorSchema.index({ currentSessionLocation: '2dsphere' });

vendorSchema.plugin(passwordPlugin);

export const Vendor = model<TVendor, IUserModel<TVendor>>(
  'Vendor',
  vendorSchema,
);
