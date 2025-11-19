/* eslint-disable no-useless-escape */

import { model, Schema } from 'mongoose';
import { TAdmin } from './admin.interface';
import { IUserModel } from '../../interfaces/user.interface';
import { USER_STATUS } from '../../constant/user.const';
import { passwordPlugin } from '../../plugins/passwordPlugin';

const adminSchema = new Schema<TAdmin, IUserModel<TAdmin>>(
  {
    userId: {
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
      //validate email
      match: [
        /^([\w-\.]+@([\w-]+\.)+[\w-]{2,4})?$/,
        'Please fill a valid email address',
      ],
    },
    password: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: Object.keys(USER_STATUS),
      default: USER_STATUS.PENDING,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    // Soft Delete
    isDeleted: {
      type: Boolean,
      default: false,
    },

    // fcm tokens for push notifications
    fcmTokens: {
      type: [String],
      default: [],
    },

    // OTP Details
    otp: {
      type: String,
    },
    isOtpExpired: {
      type: Date,
    },

    // password reset
    passwordResetToken: {
      type: String,
    },
    passwordResetTokenExpiresAt: {
      type: Date,
    },

    // Personal Details
    name: {
      firstName: {
        type: String,
        default: '',
      },
      lastName: {
        type: String,
        default: '',
      },
    },
    contactNumber: {
      type: String,
      default: '',
    },
    address: {
      street: {
        type: String,
        default: '',
      },
      city: {
        type: String,
        default: '',
      },
      state: {
        type: String,
        default: '',
      },
      country: {
        type: String,
        default: '',
      },
      zipCode: {
        type: String,
        default: '',
      },
    },

    profilePhoto: {
      type: String,
      default: '',
    },
    passwordChangedAt: {
      type: Date,
    },

    // Permissions
    permissions: {
      type: [String],
      default: [],
    },

    // Security & Access Details
    twoFactorEnabled: {
      type: Boolean,
      default: false,
    },
    loginDevices: [
      {
        deviceId: { type: String },
        lastLogin: { type: Date },
      },
    ],
    // Admin & Audit Fields
    approvedBy: {
      type: String,
      default: '',
    },
    rejectedBy: {
      type: String,
      default: '',
    },
    blockedBy: {
      type: String,
      default: '',
    },
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
  }
);

adminSchema.plugin(passwordPlugin);

export const Admin = model<TAdmin, IUserModel<TAdmin>>('Admin', adminSchema);
