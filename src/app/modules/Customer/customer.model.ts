/* eslint-disable no-useless-escape */
import { Schema, model } from 'mongoose';
import { TCustomer } from './customer.interface';
import { IUserModel } from '../../interfaces/user.interface';
import { passwordPlugin } from '../../plugins/passwordPlugin';
import { loginDeviceSchema, USER_STATUS } from '../../constant/user.constant';

const customerSchema = new Schema<TCustomer, IUserModel<TCustomer>>(
  {
    // ----------------------------------------------------------------
    // Core Identifiers
    // ----------------------------------------------------------------
    userId: { type: String, required: true, unique: true },

    role: {
      type: String,
      enum: ['CUSTOMER'],
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
      select: false,
    },

    status: {
      type: String,
      enum: Object.keys(USER_STATUS),
      default: USER_STATUS.APPROVED,
    },

    isOtpVerified: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },

    // ----------------------------------------------------------------
    // FCM Tokens
    // ----------------------------------------------------------------
    fcmTokens: { type: [String], default: [] },

    // ----------------------------------------------------------------
    // OTP & Password Reset
    // ----------------------------------------------------------------
    otp: { type: String, default: '' },
    isOtpExpired: { type: Date, default: null },
    requiresOtpVerification: { type: Boolean, default: true },

    passwordResetToken: { type: String, default: '' },
    passwordResetTokenExpiresAt: { type: Date, default: null },

    // ----------------------------------------------------------------
    // Personal Details
    // ----------------------------------------------------------------
    name: {
      firstName: { type: String, default: '' },
      lastName: { type: String, default: '' },
    },

    contactNumber: { type: String, default: '' },

    profilePhoto: { type: String, default: '' },

    passwordChangedAt: { type: Date },

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

    // Multiple Saved Addresses
    deliveryAddresses: [
      {
        street: { type: String, default: '' },
        city: { type: String, default: '' },
        state: { type: String, default: '' },
        country: { type: String, default: '' },
        postalCode: { type: String, default: '' },
        latitude: { type: Number },
        longitude: { type: Number },
        geoAccuracy: { type: Number },
        isActive: { type: Boolean, default: true },
      },
    ],

    // ----------------------------------------------------------------
    // Order & Activity Details
    // ----------------------------------------------------------------
    orders: {
      totalOrders: { type: Number, default: 0 },
      totalSpent: { type: Number, default: 0 },
      lastOrderDate: { type: Date, default: null },
      lastLoginAt: { type: Date, default: null },
    },

    // ----------------------------------------------------------------
    // Security & Access
    // ----------------------------------------------------------------
    twoFactorEnabled: { type: Boolean, default: false },

    loginDevices: {
      type: [loginDeviceSchema],
      default: [],
    },

    // ----------------------------------------------------------------
    // Admin Workflow / Audit
    // ----------------------------------------------------------------
    approvedBy: { type: String, default: '' },
    rejectedBy: { type: String, default: '' },
    blockedBy: { type: String, default: '' },
    approvedOrRejectedOrBlockedAt: { type: Date, default: null },
    remarks: { type: String, default: '' },

    // ----------------------------------------------------------------
    // Referral & Loyalty
    // ----------------------------------------------------------------
    referralCode: { type: String, default: '' },
    loyaltyPoints: { type: Number, default: 0 },

    // ----------------------------------------------------------------
    // Payment Methods
    // ----------------------------------------------------------------
    paymentMethods: [
      {
        cardType: { type: String, required: true },
        lastFourDigits: { type: String, required: true },
        expiryDate: { type: String, required: true },
        isDefault: { type: Boolean, default: false },
      },
    ],
  },
  {
    timestamps: true,
    virtuals: true,
  }
);

customerSchema.plugin(passwordPlugin);

export const Customer = model<TCustomer, IUserModel<TCustomer>>(
  'Customer',
  customerSchema
);
