/* eslint-disable no-useless-escape */
import { model, Schema } from 'mongoose';
import { TAdmin } from './admin.interface';
import { USER_STATUS } from '../../constant/GlobalConstant/user.constant';
import { liveLocationSchema } from '../../constant/GlobalModel/location.model';
import { IAuthLookupModel } from '../../interfaces/user.interface';

const adminSchema = new Schema<TAdmin, IAuthLookupModel<TAdmin>>(
  {
    // --------------------------------------------------------
    // Core Identifiers
    // --------------------------------------------------------
    userCustomId: {
      type: String,
      required: true,
      unique: true,
    },
    registeredBy: {
      type: Schema.Types.ObjectId,
      default: null,
      ref: 'Admin',
    },
    status: {
      type: String,
      enum: Object.keys(USER_STATUS),
      default: USER_STATUS.PENDING,
    },
    isUpdateLocked: {
      type: Boolean,
      default: false,
    },

    // --------------------------------------------------------
    // Pending temporary Email and contact number
    // --------------------------------------------------------
    pendingEmail: { type: String },
    pendingContactNumber: { type: String },

    // --------------------------------------------------------
    // Personal Details
    // --------------------------------------------------------
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
      idProofFront: { type: String, default: '' },
      idProofBack: { type: String, default: '' },
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

export const Admin = model<TAdmin, IAuthLookupModel<TAdmin>>(
  'Admin',
  adminSchema,
);

export type TAdminImageDocuments = {
  docImageTitle: 'idProofFront' | 'idProofBack';
};
