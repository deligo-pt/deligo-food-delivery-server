import { Schema } from 'mongoose';

export const loginDeviceSchema = new Schema(
  {
    deviceId: {
      type: String,
      default: '',
    },
    deviceType: {
      type: String,
      default: '',
    },
    deviceName: {
      type: String,
      default: '',
    },
    fcmToken: {
      type: String,
      default: '',
    },
    userAgent: {
      type: String,
      default: '',
    },
    ip: {
      type: String,
      default: '',
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    isLoggedIn: {
      type: Boolean,
      default: false,
    },
    lastLogin: {
      type: Date,
      default: null,
    },
    lastLogout: {
      type: Date,
      default: null,
    },
  },
  { _id: false },
);
