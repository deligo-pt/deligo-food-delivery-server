/* eslint-disable no-useless-escape */
import { Schema, model } from 'mongoose';
import { TCustomer } from './customer.interface';
import { IUserModel } from '../../interfaces/user.interface';
import { USER_STATUS } from '../../constant/user.constant';
import { userSchemaPlugin } from '../../plugins/passwordPlugin';
import { AddressType } from './customer.constant';
import { liveLocationSchema } from '../../constant/GlobalModel/global.model';

const customerSchema = new Schema<TCustomer, IUserModel<TCustomer>>(
  {
    // ------------------------------------------------------
    // Core Identifiers (Synced with Interface)
    // ------------------------------------------------------
    authUserId: {
      type: String,
      required: true,
      unique: true
    },
    customUserId: {
      type: String,
      required: true,
      unique: true
    },
    role: {
      type: String,
      enum: ['CUSTOMER'],
      required: true,
      default: 'CUSTOMER',
    },
    email: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
      sparse: true,
      match: [
        /^([\w-\.]+@([\w-]+\.)+[\w-]{2,4})?$/,
        'Please fill a valid email address',
      ],
    },
    status: {
      type: String,
      enum: Object.keys(USER_STATUS),
      required: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },

    // Name & Contact Number
    name: {
      firstName: { type: String },
      lastName: { type: String },
    },
    contactNumber: { type: String },

    // ------------------------------------------------------
    // Current/Real-Time Location Data
    // ------------------------------------------------------
    currentSessionLocation: { type: liveLocationSchema },

    // ------------------------------------------------------
    // Multiple Saved Delivery Addresses
    // ------------------------------------------------------
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

        // Zone Integration & Metadata
        zoneId: { type: Schema.Types.ObjectId, ref: 'Zone', default: null },
        addressType: { type: String, enum: Object.keys(AddressType) },
        notes: { type: String },
      },
    ],

    // ------------------------------------------------------
    // Referral
    // ------------------------------------------------------
    referralCode: { type: String, default: '' },
    referredBy: { type: Schema.Types.ObjectId, default: null, ref: 'Customer' },

    // ------------------------------------------------------
    // Payment Methods
    // ------------------------------------------------------
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
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// GEO INDEX FOR REAL-TIME LOCATION
customerSchema.index({ currentSessionLocation: '2dsphere' });

// Plugins
customerSchema.plugin(userSchemaPlugin);

export const Customer = model<TCustomer, IUserModel<TCustomer>>(
  'Customer',
  customerSchema,
);