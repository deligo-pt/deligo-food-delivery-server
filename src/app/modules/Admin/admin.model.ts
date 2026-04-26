/* eslint-disable no-useless-escape */
import { model, Schema } from 'mongoose';
import { TAdmin } from './admin.interface';
import { IUserModel } from '../../interfaces/user.interface';
import { USER_STATUS } from '../../constant/user.constant';
import { userSchemaPlugin } from '../../plugins/passwordPlugin';
import { liveLocationSchema } from '../../constant/GlobalModel/global.model';

const adminSchema = new Schema<TAdmin, IUserModel<TAdmin>>(
  {
    // --------------------------------------------------------
    // Core Identifiers (Synced with Interface)
    // --------------------------------------------------------
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
      required: true,
    },
    isUpdateLocked: {
      type: Boolean,
      default: false,
    },

    // --------------------------------------------------------
    // Real-Time Location
    // --------------------------------------------------------
    currentSessionLocation: {
      type: liveLocationSchema,
    },

    // --------------------------------------------------------
    // Permissions & Role Controls
    // --------------------------------------------------------
    permissions: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Geo-spatial index if currentSessionLocation is used
adminSchema.index({ currentSessionLocation: '2dsphere' });

// password hashing plugin
adminSchema.plugin(userSchemaPlugin);

export const Admin = model<TAdmin, IUserModel<TAdmin>>('Admin', adminSchema);
