/* eslint-disable no-useless-escape */
import { Schema, model } from 'mongoose';
import { TVendor } from './vendor.interface';
import { USER_STATUS } from '../../constant/GlobalConstant/user.constant';
import { liveLocationSchema } from '../../constant/GlobalModel/location.model';
import { localizedSchema } from '../../constant/GlobalModel/language.model';

const vendorSchema = new Schema<TVendor>(
  {
    // -------------------------------------------------------
    // Core Identifiers
    // -------------------------------------------------------
    userId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    registeredBy: {
      id: {
        type: Schema.Types.ObjectId,
        refPath: 'registeredBy.model',
        required: false,
      },
      model: {
        type: String,
        enum: ['Admin', 'Vendor'],
      },
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
    status: {
      type: String,
      enum: Object.keys(USER_STATUS),
      default: USER_STATUS.PENDING,
    },
    isDeleted: { type: Boolean, default: false },
    isUpdateLocked: { type: Boolean, default: false },

    // -------------------------------------------------------
    // Personal Details
    // -------------------------------------------------------
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
      country: { type: String, default: '' },
      postalCode: { type: String, default: '' },
      longitude: { type: Number },
      latitude: { type: Number },
      geoAccuracy: { type: Number },
      detailedAddress: { type: String, default: '' },
    },

    // -------------------------------------------------------
    // Business Details
    // -------------------------------------------------------
    businessDetails: {
      businessName: { type: String, default: '' },
      businessType: { type: localizedSchema },
      restaurantCuisineType: {
        type: [String],
      },
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
      iban: { type: String, default: '' },
      swiftCode: { type: String, default: '' },
    },

    // -------------------------------------------------------
    // Documents * verification
    // -------------------------------------------------------
    documents: {
      myPhoto: { type: [String], default: [] },
      businessLicenseDoc: { type: [String], default: [] },
      taxDoc: { type: [String], default: [] },
      idProofFront: { type: [String], default: [] },
      idProofBack: { type: [String], default: [] },
      storePhoto: { type: [String], default: [] },
      menuUpload: { type: [String], default: [] },
      agoserisHaccpCertificate: { type: [String], default: [] },
    },

    // -------------------------------------------------------
    // Rating & Activity
    // -------------------------------------------------------
    rating: {
      average: { type: Number, default: 0 },
      totalReviews: { type: Number, default: 0 },
    },

    // -------------------------------------------------------
    // Admin Workflow / Audit
    // -------------------------------------------------------
    approvedBy: { type: Schema.Types.ObjectId, default: null, ref: 'Admin' },
    rejectedBy: { type: Schema.Types.ObjectId, default: null, ref: 'Admin' },
    blockedBy: { type: Schema.Types.ObjectId, default: null, ref: 'Admin' },
    submittedForApprovalAt: { type: Date, default: null },
    approvedOrRejectedOrBlockedAt: { type: Date, default: null },
    remarks: { type: String, default: '' },
  },
  {
    timestamps: true,
    virtuals: true,
  },
);

vendorSchema.index({ currentSessionLocation: '2dsphere' });

vendorSchema.index({
  status: 1,
  isDeleted: 1,
  'businessLocation.latitude': 1,
  'businessLocation.longitude': 1,
});

// -------------------------------------------------------
// Virtual Populate for Cuisines
// -------------------------------------------------------
vendorSchema.virtual('cuisinesData', {
  ref: 'Cuisine',
  localField: 'businessDetails.restaurantCuisineType',
  foreignField: 'slug',
});

vendorSchema.set('toObject', { virtuals: true });
vendorSchema.set('toJSON', { virtuals: true });

export const Vendor = model<TVendor>('Vendor', vendorSchema);
