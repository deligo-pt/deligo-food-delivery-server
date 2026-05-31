/* eslint-disable no-useless-escape */
import { model, Schema } from 'mongoose';
import { TAdmin } from './admin.interface';
import { USER_STATUS } from '../../constant/GlobalConstant/user.constant';
import { liveLocationSchema } from '../../constant/GlobalModel/location.model';

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
      ref: 'AuthUser',
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

    isDeleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    virtuals: true,
  },
);

export const Admin = model<TAdmin>('Admin', adminSchema);

export type TAdminImageDocuments = {
  docImageTitle: 'idProofFront' | 'idProofBack';
};
