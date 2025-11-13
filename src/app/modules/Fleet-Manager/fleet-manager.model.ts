/* eslint-disable no-useless-escape */
import { Schema, model } from 'mongoose';
import { TFleetManager } from './fleet-manager.interface';
import { USER_STATUS } from '../../constant/user.const';
import { IUserModel } from '../../interfaces/user.interface';
import { passwordPlugin } from '../../plugins/passwordPlugin';

const fleetManagerSchema = new Schema<TFleetManager, IUserModel<TFleetManager>>(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
    },
    role: {
      type: String,
      enum: ['FLEET_MANAGER'],
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

    // fcm token for push notifications
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

    //  Company Details
    companyDetails: {
      companyName: { type: String, default: '' },
      companyLicenseNumber: { type: String, default: '' },
    },
    // Company Location
    companyLocation: {
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
      idProof: { type: String, default: '' },
      companyLicense: { type: String, default: '' },
    },
    // Operation Data
    operationalData: {
      noOfDrivers: { type: Number, default: null },
      activeVehicles: { type: Number, default: null },
      totalDeliveries: { type: Number, default: null },
      rating: {
        average: { type: Number, default: null },
        total: { type: Number, default: null },
      },
    },

    // Security & Access Control
    twoFactorEnabled: { type: Boolean, default: false },
    loginDevices: [
      {
        deviceId: { type: String, required: true },
        lastLogin: { type: Date, default: Date.now },
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

fleetManagerSchema.plugin(passwordPlugin);

export const FleetManager = model<TFleetManager, IUserModel<TFleetManager>>(
  'FleetManager',
  fleetManagerSchema
);
