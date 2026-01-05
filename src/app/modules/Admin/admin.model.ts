/* eslint-disable no-useless-escape */

import { model, Schema } from 'mongoose';
import { TAdmin } from './admin.interface';
import { IUserModel } from '../../interfaces/user.interface';
import { loginDeviceSchema, USER_STATUS } from '../../constant/user.constant';
import { passwordPlugin } from '../../plugins/passwordPlugin';
import { locationSchema } from '../Delivery-Partner/delivery-partner.model';

const adminSchema = new Schema<TAdmin, IUserModel<TAdmin>>(
  {
    // --------------------------------------------------------
    // Core Identifiers
    // --------------------------------------------------------
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
      enum: ['ADMIN', 'SUPER_ADMIN'],
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: Object.keys(USER_STATUS),
      default: USER_STATUS.PENDING,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    isUpdateLocked: {
      type: Boolean,
      default: false,
    },

    // --------------------------------------------------------
    // Push Tokens
    // --------------------------------------------------------
    fcmTokens: {
      type: [String],
      default: [],
    },

    // --------------------------------------------------------
    // Pending temporary Email and contact number
    // --------------------------------------------------------
    pendingEmail: { type: String },
    pendingContactNumber: { type: String },

    // --------------------------------------------------------
    // OTP & Password Reset
    // --------------------------------------------------------
    otp: { type: String },
    isOtpExpired: { type: Date },

    passwordResetToken: { type: String, default: null },
    passwordResetTokenExpiresAt: { type: Date, default: null },
    passwordChangedAt: { type: Date, default: null },

    // --------------------------------------------------------
    // Personal Details
    // --------------------------------------------------------
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
      longitude: { type: Number, default: null },
      latitude: { type: Number, default: null },
      geoAccuracy: { type: Number, default: null },
    },

    NIF: { type: String, default: '' },

    currentSessionLocation: {
      type: locationSchema,
    },

    // ---------------------------------------------
    // Documents & Verification
    // ---------------------------------------------
    documents: {
      idProofFront: { type: String, default: '' },
      idProofBack: { type: String, default: '' },
    },

    // --------------------------------------------------------
    // Security & Access
    // --------------------------------------------------------
    twoFactorEnabled: {
      type: Boolean,
      default: false,
    },
    loginDevices: {
      type: [loginDeviceSchema],
      default: [],
    },

    // --------------------------------------------------------
    // Permissions
    // --------------------------------------------------------
    permissions: {
      type: [String],
      default: [],
    },

    // --------------------------------------------------------
    // Admin Workflow & Audit
    // --------------------------------------------------------
    approvedBy: { type: Schema.Types.ObjectId, default: null, ref: 'Admin' },
    rejectedBy: { type: Schema.Types.ObjectId, default: null, ref: 'Admin' },
    blockedBy: { type: Schema.Types.ObjectId, default: null, ref: 'Admin' },

    submittedForApprovalAt: {
      type: Date,
      default: null,
    },
    approvedOrRejectedOrBlockedAt: {
      type: Date,
      default: null,
    },

    remarks: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
    virtuals: true,
  }
);

// password hashing plugin
adminSchema.plugin(passwordPlugin);

export const Admin = model<TAdmin, IUserModel<TAdmin>>('Admin', adminSchema);

export type TAdminImageDocuments = {
  docImageTitle: 'idProofFront' | 'idProofBack';
};
