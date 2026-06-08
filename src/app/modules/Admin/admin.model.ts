/* eslint-disable no-useless-escape */

import { model, Schema } from 'mongoose';
import { TAdmin } from './admin.interface';
import { USER_STATUS } from '../../constant/GlobalConstant/user.constant';
import { passwordPlugin } from '../../plugins/passwordPlugin';
import { liveLocationSchema } from '../../constant/GlobalModel/location.model';
import { loginDeviceSchema } from '../../constant/GlobalModel/user.model';

const adminSchema = new Schema<TAdmin>(
  {
    // --------------------------------------------------------
    // Core Identifiers
    // --------------------------------------------------------
    userId: {
      type: String,
      required: true,
      unique: true,
    },
    registeredBy: {
      type: Schema.Types.ObjectId,
      default: null,
      ref: 'Admin',
    },
    role: {
      type: String,
      enum: ['ADMIN', 'SUPER_ADMIN'],
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    status: {
      type: String,
      enum: Object.keys(USER_STATUS),
      default: USER_STATUS.PENDING,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    isUpdateLocked: {
      type: Boolean,
      default: false,
    },

    // --------------------------------------------------------
    // Personal Details
    // --------------------------------------------------------
    name: {
      firstName: { type: String, default: '' },
      lastName: { type: String, default: '' },
    },
    contactNumber: { type: String, default: '', trim: true },
    profilePhoto: { type: String, default: '' },

    address: {
      street: { type: String, default: '' },
      city: { type: String, default: '' },
      state: { type: String, default: '' },
      country: { type: String, default: '' },
      postalCode: { type: String, default: '' },
      longitude: { type: Number, default: null },
      latitude: { type: Number, default: null },
      geoAccuracy: { type: Number, default: null },
      detailedAddress: { type: String, default: '' },
    },

    NIF: { type: String, default: '' },

    currentSessionLocation: {
      type: liveLocationSchema,
    },

    // ---------------------------------------------
    // Documents & Verification
    // ---------------------------------------------
    documents: {
      myPhoto: { type: String, default: '' },
      idProofFront: { type: String, default: '' },
      idProofBack: { type: String, default: '' },
    },

    // --------------------------------------------------------
    // Permissions
    // --------------------------------------------------------
    permissions: {
      type: [String],
      default: [],
    },
    // --------------------------------------------------------
    // Admin Workflow & Audit
    // --------------------------------------------------------
    approvedBy: { type: Schema.Types.ObjectId, default: null, ref: 'Admin' },
    rejectedBy: { type: Schema.Types.ObjectId, default: null, ref: 'Admin' },
    blockedBy: { type: Schema.Types.ObjectId, default: null, ref: 'Admin' },

    submittedForApprovalAt: {
      type: Date,
      default: null,
    },
    approvedOrRejectedOrBlockedAt: {
      type: Date,
      default: null,
    },

    remarks: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
    virtuals: true,
  },
);

// password hashing plugin

export const Admin = model<TAdmin>('Admin', adminSchema);

export type TAdminImageDocuments = {
  docImageTitle: 'myPhoto' | 'idProofFront' | 'idProofBack';
};
