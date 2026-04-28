/* eslint-disable no-useless-escape */
import { Schema, model } from 'mongoose';
import { TVendor } from './vendor.interface';
import { IUserModel } from '../../interfaces/user.interface';
import { liveLocationSchema } from '../../constant/GlobalModel/global.model';
import { USER_STATUS } from '../../constant/user.constant';
import { userSchemaPlugin } from '../../plugins/passwordPlugin';

const vendorSchema = new Schema<TVendor, IUserModel<TVendor>>(
  {
    // -------------------------------------------------------
    // Core Identifiers
    // -------------------------------------------------------
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
    isUpdateLocked: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
    status: {
      type: String,
      enum: Object.keys(USER_STATUS),
      default: USER_STATUS.PENDING,
    },

    // ------------------------------------------------------
    // Referral
    // ------------------------------------------------------
    referralCode: { type: String, unique: true },
    referredBy: {
      type: Schema.Types.ObjectId,
      default: null,
      ref: 'Vendor',
    },

    // -------------------------------------------------------
    // Name
    // -------------------------------------------------------
    name: {
      firstName: { type: String },
      lastName: { type: String },
    },
    contactNumber: { type: String },

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
      accountNumber: { type: String, default: '' },
      iban: { type: String, default: '' },
      swiftCode: { type: String, default: '' },
    },

    // -------------------------------------------------------
    // Rating & Activity
    // -------------------------------------------------------
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

vendorSchema.index({ currentSessionLocation: '2dsphere' });

vendorSchema.plugin(userSchemaPlugin);

export const Vendor = model<TVendor, IUserModel<TVendor>>(
  'Vendor',
  vendorSchema,
);
