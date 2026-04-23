/* eslint-disable no-useless-escape */
import { Schema, model } from 'mongoose';
import { TFleetManager } from './fleet-manager.interface';
import { USER_STATUS } from '../../constant/user.constant';
import { IUserModel } from '../../interfaces/user.interface';
import { passwordPlugin } from '../../plugins/passwordPlugin';
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

    password: {
      type: String,
      required: true,
      select: false,
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

    currentSessionLocation: {
      type: liveLocationSchema,
    },

    // ------------------------------------------
    // Business Details
    // ------------------------------------------
    businessDetails: {
      businessName: { type: String, required: true },
      businessLicenseNumber: { type: String },
      NIF: { type: String },
      totalBranches: { type: Number },
    },

    businessLocation: {
      street: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      country: { type: String, required: true },
      postalCode: { type: String, required: true },
      latitude: { type: Number },
      longitude: { type: Number },
      geoAccuracy: { type: Number },
    },

    // ------------------------------------------
    // Bank & Payment Information
    // ------------------------------------------
    bankDetails: {
      bankName: { type: String, required: true },
      accountHolderName: { type: String, required: true },
      iban: { type: String, required: true },
      swiftCode: { type: String, required: true },
    },

    // ------------------------------------------
    // Operational Data
    // ------------------------------------------
    operationalData: {
      totalDrivers: { type: Number, default: 0 },
      activeVehicles: { type: Number },
      totalDeliveries: { type: Number },
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

fleetManagerSchema.plugin(passwordPlugin);

export const FleetManager = model<TFleetManager, IUserModel<TFleetManager>>(
  'FleetManager',
  fleetManagerSchema,
);