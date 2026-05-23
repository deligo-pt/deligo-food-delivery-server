/* eslint-disable no-useless-escape */
import { Schema, model } from 'mongoose';
import { TCustomer } from './customer.interface';
import { USER_STATUS } from '../../constant/GlobalConstant/user.constant';
import { AddressType } from './customer.constant';
import { liveLocationSchema } from '../../constant/GlobalModel/location.model';

const customerSchema = new Schema<TCustomer>(
  {
    // ----------------------------------------------------------------
    // Core Identifiers
    // ----------------------------------------------------------------
    userId: { type: String, required: true, unique: true },

    status: {
      type: String,
      enum: Object.keys(USER_STATUS),
      default: USER_STATUS.APPROVED,
    },

    // --------------------------------------------------------
    // Pending temporary Email and contact number
    // --------------------------------------------------------
    pendingEmail: { type: String },
    pendingContactNumber: { type: String },

    // ----------------------------------------------------------------
    // Personal Details
    // ----------------------------------------------------------------
    name: {
      firstName: { type: String, default: '' },
      lastName: { type: String, default: '' },
    },

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
      detailedAddress: { type: String },
    },

    NIF: { type: String, default: '' },

    // ----------------------------------------------------------------
    // Current/Real-Time Location Data (For live tracking during delivery)
    // ----------------------------------------------------------------
    currentSessionLocation: { type: liveLocationSchema },

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
        detailedAddress: { type: String },
        isActive: { type: Boolean, default: false },

        addressType: { type: String, enum: Object.keys(AddressType) },
        notes: { type: String },
      },
    ],

    // ----------------------------------------------------------------
    // Referral & Loyalty
    // ----------------------------------------------------------------
    referralCode: { type: String, default: '' },
    referredBy: { type: Schema.Types.ObjectId, default: null, ref: 'Customer' },
    // ----------------------------------------------------------------
    // Admin Workflow / Audit
    // ----------------------------------------------------------------
    approvedBy: { type: Schema.Types.ObjectId, default: null, ref: 'Admin' },
    rejectedBy: { type: Schema.Types.ObjectId, default: null, ref: 'Admin' },
    blockedBy: { type: Schema.Types.ObjectId, default: null, ref: 'Admin' },
    approvedOrRejectedOrBlockedAt: { type: Date, default: null },
    remarks: { type: String, default: '' },
  },
  {
    timestamps: true,
    virtuals: true,
  },
);

// GEO INDEX FOR REAL-TIME LOCATION
customerSchema.index({ currentSessionLocation: '2dsphere' });

export const Customer = model<TCustomer>('Customer', customerSchema);
