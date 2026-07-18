import mongoose, { Schema } from 'mongoose';
import { USER_ROLE } from '../../constant/GlobalConstant/user.constant';
import {
  deviceTypes,
  failureReasons,
  TLoginHistory,
} from './loginHistory.interface';

const LoginHistorySchema: Schema = new Schema<TLoginHistory>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'AuthUser',
      required: false,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    userRole: {
      type: String,
      enum: Object.values(USER_ROLE),
      required: true,
    },
    ipAddress: {
      type: String,
      required: true,
    },
    city: { type: String, default: 'Unknown' },
    country: { type: String, default: 'Unknown' },
    deviceType: {
      type: String,
      enum: deviceTypes,
      default: 'UNKNOWN',
    },
    browser: { type: String, required: true },
    os: { type: String, required: true },
    userAgent: { type: String, required: true }, // Raw string
    status: {
      type: String,
      enum: ['SUCCESS', 'FAILED'],
      required: true,
    },
    failureReason: {
      type: String,
      enum: failureReasons,
      required: false,
    },
    sessionId: {
      type: String,
      required: false,
    },
    loginAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
    logoutAt: {
      type: Date,
    },
    durationSec: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: false,
    versionKey: false,
  },
);

// --- INDUSTRY STANDARD INDEXING ---
LoginHistorySchema.index({ email: 1, loginAt: -1 });
LoginHistorySchema.index({ userId: 1 });
LoginHistorySchema.index({ sessionId: 1 });

export const LoginHistory = mongoose.model<TLoginHistory>(
  'LoginHistory',
  LoginHistorySchema,
);
