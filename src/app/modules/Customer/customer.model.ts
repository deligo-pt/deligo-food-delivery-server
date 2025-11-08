/* eslint-disable no-useless-escape */
import { Schema, model } from 'mongoose';
import { TCustomer } from './customer.interface';
import { IUserModel } from '../../interfaces/user.interface';
import { passwordPlugin } from '../../plugins/passwordPlugin';
import { USER_STATUS } from '../../constant/user.const';

const customerSchema = new Schema<TCustomer, IUserModel<TCustomer>>(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
    },
    role: {
      type: String,
      enum: ['CUSTOMER'],
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: Object.keys(USER_STATUS),
      default: USER_STATUS.APPROVED,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
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
      default: '',
    },
    isOtpExpired: {
      type: Date,
      default: null,
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
    profilePhoto: {
      type: String,
      default: '',
    },
    passwordChangedAt: {
      type: Date,
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
    deliveryAddresses: [
      {
        address: {
          type: String,
          default: '',
        },
        isActive: {
          type: Boolean,
          default: false,
        },
      },
    ],

    // Order & Activity Details
    orders: {
      totalOrders: {
        type: Number,
        default: 0,
      },
      totalSpent: {
        type: Number,
        default: 0,
      },
      lastOrderDate: {
        type: Date,
        default: null,
      },
      lastLoginAt: {
        type: Date,
        default: null,
      },
    },
    // Security & Access Details
    twoFactorEnabled: {
      type: Boolean,
      default: false,
    },
    loginDevices: [
      {
        deviceId: {
          type: String,
          required: true,
        },
        lastLogin: {
          type: Date,
          default: null,
        },
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
    remarks: {
      type: String,
      default: '',
    },
    // referral & loyalty
    referralCode: {
      type: String,
      default: '',
    },
    loyaltyPoints: {
      type: Number,
      default: 0,
    },
    // paymentDetails
    paymentMethods: [
      {
        cardType: {
          type: String,
          required: true,
        },
        lastFourDigits: {
          type: String,
          required: true,
        },
        expiryDate: {
          type: String,
          required: true,
        },
        isDefault: {
          type: Boolean,
          default: false,
        },
      },
    ],
  },
  {
    timestamps: true,
    virtuals: true,
  }
);

customerSchema.plugin(passwordPlugin);

export const Customer = model<TCustomer, IUserModel<TCustomer>>(
  'Customer',
  customerSchema
);
