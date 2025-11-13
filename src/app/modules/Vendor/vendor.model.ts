/* eslint-disable no-useless-escape */
import { Schema, model } from 'mongoose';
import { TVendor } from './vendor.interface';
import { IUserModel } from '../../interfaces/user.interface';
import { USER_STATUS } from '../../constant/user.const';
import { passwordPlugin } from '../../plugins/passwordPlugin';

const vendorSchema = new Schema<TVendor, IUserModel<TVendor>>(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
    },
    role: {
      type: String,
      enum: ['VENDOR'],
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
      default: 'PENDING',
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    // Rating & Activity
    rating: {
      average: { type: Number, default: 0 },
      totalReviews: { type: Number, default: 0 },
    },
    totalOrders: { type: Number, default: 0 },
    lastLoginAt: { type: Date, default: null },

    // fcm tokens
    fcmTokens: { type: [String], default: [] },

    // OTP Details
    otp: { type: String, default: '' },
    isOtpExpired: { type: Date, default: null },

    // Personal Details
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
      postalCode: { type: String, default: '' },
      country: { type: String, default: '' },
    },
    passwordChangedAt: { type: Date, default: null },

    //  Business Details
    businessDetails: {
      businessName: { type: String, default: '' },
      businessType: {
        type: String,
        default: '',
      },
      businessLicenseNumber: { type: String, default: '' },
      NIF: { type: String, default: '' },
      noOfBranch: { type: Number, default: null },
      openingHours: { type: String, default: '' },
      closingHours: { type: String, default: '' },
      closingDays: { type: [String], default: [] },
    },
    // Business Location
    businessLocation: {
      streetAddress: { type: String, default: '' },
      streetNumber: { type: String, default: '' },
      city: { type: String, default: '' },
      postalCode: { type: String, default: '' },
      latitude: { type: Number, default: null },
      longitude: { type: Number, default: null },
      geoAccuracy: { type: Number, default: null }, // meters
    },
    // Bank & Payment Information
    bankDetails: {
      bankName: { type: String, default: '' },
      accountHolderName: { type: String, default: '' },
      iban: { type: String, default: '' },
      swiftCode: { type: String, default: '' },
    },
    // Documents & Verification
    documents: {
      businessLicenseDoc: { type: String, default: '' },
      taxDoc: { type: String, default: '' },
      idProof: { type: String, default: '' },
      storePhoto: { type: String, default: '' },
      menuUpload: { type: String, default: '' },
    },

    // Security & Access Control
    twoFactorEnabled: { type: Boolean, default: false },
    loginDevices: [
      {
        deviceId: { type: String, default: '' },
        lastLogin: { type: Date, default: null },
      },
    ],

    // Admin & Audit Fields
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
