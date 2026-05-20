import { Schema, model } from 'mongoose';
import { TAuthUser } from './authUser.interface';
import { loginDeviceSchema } from '../../constant/GlobalModel/user.model';
import { authLookupPlugin } from '../../plugins/authLookupPlugin';
import { passwordPlugin } from '../../plugins/passwordPlugin';
import { IAuthUserModel } from '../../interfaces/user.interface';

const authUserSchema = new Schema<TAuthUser, IAuthUserModel>(
  {
    // 1. Core Identifiers & Relations Mapping
    authUserId: {
      type: String,
      required: [true, 'Auth User ID (UUID) is required'],
      unique: true,
      trim: true,
    },
    userObjectId: {
      type: Schema.Types.ObjectId,
      required: [true, 'User Object ID reference is required'],
    },
    customUserId: {
      type: String,
      required: [true, 'Custom User ID is required'],
      unique: true,
      trim: true,
    },
    email: {
      type: String,
      required: false, // Optional because of TCustomer support
      unique: true,
      sparse: true, // CRITICAL: Allows multiple documents to have 'null/undefined' email without unique conflict
      lowercase: true,
      trim: true,
    },
    contactNumber: {
      type: String,
      required: false,
      unique: true,
      sparse: true, // CRITICAL: Allows documents without phone numbers without unique conflict
      trim: true,
    },
    role: {
      type: String,
      required: [true, 'Role is required'],
      trim: true,
    },

    // 2. Live Status & Access Control (RBAC)
    status: {
      type: String,
      required: [true, 'Status is required'],
      default: 'PENDING',
      trim: true,
    },
    permissions: {
      type: [String],
      default: [],
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },

    // 3. Real-Time Device Management & Session Tracking
    loginDevices: { type: [loginDeviceSchema], default: [] },

    // 4. OTP & Email Verification Flow
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    isContactNumberVerified: {
      type: Boolean,
      default: false,
    },

    // 5. Password Credentials & Security Audit Logs
    password: {
      type: String,
      required: false, // Kept optional as some users might use social/OTP login
    },
    passwordResetToken: {
      type: String,
      default: null,
    },
    passwordResetTokenExpiresAt: {
      type: Date,
      default: null,
    },
    passwordChangedAt: {
      type: Date,
      default: null,
    },
    twoFactorEnabled: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

authUserSchema.plugin(authLookupPlugin);
authUserSchema.plugin(passwordPlugin);

export const AuthUser = model<TAuthUser, IAuthUserModel>(
  'AuthUser',
  authUserSchema,
);
