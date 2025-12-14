/* eslint-disable no-useless-escape */
import { Schema, model } from 'mongoose';
import { TCustomer } from './customer.interface';
import { IUserModel } from '../../interfaces/user.interface';
import { loginDeviceSchema, USER_STATUS } from '../../constant/user.constant';
import { passwordPlugin } from '../../plugins/passwordPlugin';
import { AddressType } from './customer.constant';

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
      unique: true,
      lowercase: true,
      trim: true,
      sparse: true,
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
    // OTP
    // ----------------------------------------------------------------
    otp: { type: String, default: '' },
    isOtpExpired: { type: Date, default: null },
    requiresOtpVerification: { type: Boolean, default: true },
    mobileOtpId: { type: String, default: '' },

    // ----------------------------------------------------------------
    // Personal Details
    // ----------------------------------------------------------------
    name: {
      firstName: { type: String, default: '' },
      lastName: { type: String, default: '' },
    },

    contactNumber: { type: String, unique: true, sparse: true },

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
    },

    // ----------------------------------------------------------------
    // CURRENT SESSION LIVE LOCATION
    // ----------------------------------------------------------------
    currentSessionLocation: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        default: [0, 0],
      },
      accuracy: { type: Number },
      lastUpdate: { type: Date, default: null },
      isSharingActive: { type: Boolean, default: false },
    },

    // ----------------------------------------------------------------
    // PAYMENT METHODS
    // ----------------------------------------------------------------
    operationalAddress: {
      street: { type: String, default: '' },
      city: { type: String, default: '' },
      state: { type: String, default: '' },
      country: { type: String, default: '' },
      postalCode: { type: String, default: '' },
      longitude: { type: Number },
      latitude: { type: Number },
      geoAccuracy: { type: Number },
    },
    // ----------------------------------------------------------------
    // MULTIPLE SAVED ADDRESSES
    // ----------------------------------------------------------------
    deliveryAddresses: [
      {
        street: { type: String },
        city: { type: String },
        state: { type: String },
        country: { type: String },
        postalCode: { type: String },
        longitude: { type: Number },
        latitude: { type: Number },
        geoAccuracy: { type: Number },
        isActive: { type: Boolean, default: false },

        // NEW FIELDS
        zoneId: { type: String, default: null },
        addressType: { type: String, enum: Object.keys(AddressType) },
        notes: { type: String },
      },
    ],

    // ----------------------------------------------------------------
    // ORDER & ACTIVITY DETAILS
    // ----------------------------------------------------------------
    orders: {
      totalOrders: { type: Number, default: 0 },
      totalSpent: { type: Number, default: 0 },
      lastOrderDate: { type: Date, default: null },
      lastLoginAt: { type: Date, default: null },

      // NEW ANALYTICS FIELDS
      avgOrderValue: { type: Number, default: 0 },
      referralsCount: { type: Number, default: 0 },
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

// GEO INDEX FOR REAL-TIME LOCATION
customerSchema.index({ currentSessionLocation: '2dsphere' });

customerSchema.plugin(passwordPlugin);

export const Customer = model<TCustomer, IUserModel<TCustomer>>(
  'Customer',
  customerSchema
);
