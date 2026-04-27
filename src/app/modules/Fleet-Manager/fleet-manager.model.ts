/* eslint-disable no-useless-escape */
import { Schema, model } from 'mongoose';
import { TFleetManager } from './fleet-manager.interface';
import { USER_STATUS } from '../../constant/user.constant';
import { IUserModel } from '../../interfaces/user.interface';
import { userSchemaPlugin } from '../../plugins/passwordPlugin';
import { liveLocationSchema } from '../../constant/GlobalModel/global.model';

const fleetManagerSchema = new Schema<TFleetManager, IUserModel<TFleetManager>>(
  {
    // ------------------------------------------
    // Core Identifiers (Synced with Interface)
    // ------------------------------------------
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
      enum: ['FLEET_MANAGER'],
      required: true,
      default: 'FLEET_MANAGER',
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
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

    isUpdateLocked: {
      type: Boolean,
      default: false
    },
    isDeleted: { type: Boolean, default: false },

    currentSessionLocation: {
      type: liveLocationSchema,
    },

    // ------------------------------------------
    // Business Details
    // ------------------------------------------
    name: {
      firstName: { type: String },
      lastName: { type: String },
    },
    contactNumber: { type: String },

    // ------------------------------------------
    // Business Details
    // ------------------------------------------
    businessDetails: {
      businessName: { type: String, default: '' },
      businessLicenseNumber: { type: String, default: '' },
      NIF: { type: String, default: '' },
      totalBranches: { type: Number, default: 1 },
    },

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

    // ------------------------------------------
    // Bank & Payment Information
    // ------------------------------------------
    bankDetails: {
      bankName: { type: String, default: '' },
      accountHolderName: { type: String, default: '' },
      iban: { type: String, default: '' },
      swiftCode: { type: String, default: '' },
    },

    // ------------------------------------------
    // Operational Data
    // ------------------------------------------
    operationalData: {
      totalDrivers: { type: Number, default: 0 },
      activeVehicles: { type: Number, default: 0 },
      totalDeliveries: { type: Number, default: 0 },
    },

    // --------------------------------------------------------
    // Rating & Activity
    // --------------------------------------------------------
    rating: {
      average: { type: Number, default: 0 },
      totalReviews: { type: Number, default: 0 },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Geo-spatial Indexing
fleetManagerSchema.index({ currentSessionLocation: '2dsphere' });

fleetManagerSchema.plugin(userSchemaPlugin);

export const FleetManager = model<TFleetManager, IUserModel<TFleetManager>>(
  'FleetManager',
  fleetManagerSchema,
);