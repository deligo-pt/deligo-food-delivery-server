/* eslint-disable no-useless-escape */
import { Schema, model } from 'mongoose';
import { TFleetManager } from './fleet-manager.interface';
import { USER_STATUS } from '../../constant/GlobalConstant/user.constant';
import { liveLocationSchema } from '../../constant/GlobalModel/location.model';

const fleetManagerSchema = new Schema<TFleetManager>(
  {
    // ------------------------------------------
    // Core Identifiers
    // ------------------------------------------
    userId: {
      type: String,
      required: true,
      unique: true,
    },

    registeredBy: {
      type: Schema.Types.ObjectId,
      ref: 'AuthUser',
    },

    isUpdateLocked: { type: Boolean, default: false },

    // ------------------------------------------
    // Personal Details
    // ------------------------------------------
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
      detailedAddress: { type: String, default: '' },
    },

    currentSessionLocation: {
      type: liveLocationSchema,
    },

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
      longitude: { type: Number },
      latitude: { type: Number },
      geoAccuracy: { type: Number },
    },

    // ------------------------------------------
    // Bank Details
    // ------------------------------------------
    bankDetails: {
      bankName: { type: String, default: '' },
      accountHolderName: { type: String, default: '' },
      iban: { type: String, default: '' },
      swiftCode: { type: String, default: '' },
    },

    // ------------------------------------------
    // Documents
    // ------------------------------------------
    documents: {
      myPhoto: { type: [String], default: [] },
      idProofFront: { type: [String], default: [] },
      idProofBack: { type: [String], default: [] },
      businessLicense: { type: [String], default: [] },
    },

    // ------------------------------------------
    // Operational Data
    // ------------------------------------------
    operationalData: {
      totalDrivers: { type: Number, default: 0 },
      activeVehicles: { type: Number, default: 0 },
      totalDeliveries: { type: Number, default: 0 },
    },

    rating: {
      average: { type: Number, default: 0 },
      totalReviews: { type: Number, default: 0 },
    },

    isDeleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    virtuals: true,
  },
);

export const FleetManager = model<TFleetManager>(
  'FleetManager',
  fleetManagerSchema,
);
