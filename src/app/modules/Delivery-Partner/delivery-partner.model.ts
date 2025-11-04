/* eslint-disable no-useless-escape */
import { Schema, model } from 'mongoose';
import { TDeliveryPartner } from './delivery-partner.interface';
import { IUserModel } from '../../interfaces/user.interface';
import { passwordPlugin } from '../../plugins/passwordPlugin';
import { USER_STATUS } from '../../constant/user.const';

const deliveryPartnerSchema = new Schema<
  TDeliveryPartner,
  IUserModel<TDeliveryPartner>
>(
  {
    deliveryPartnerId: {
      type: String,
      required: true,
      unique: true,
    },
    role: {
      type: String,
      enum: ['DELIVERY_PARTNER'],
      required: true,
    },
    email: {
      type: String,
      required: true,
      //validate email
      lowercase: true,
      trim: true,
      match: [
        /^([\w-\.]+@([\w-]+\.)+[\w-]{2,4})?$/,
        'Please fill a valid email address',
      ],
    },
    password: {
      type: String,
      required: true,
      select: 0,
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
    isDeleted: {
      type: Boolean,
      default: false,
    },

    // OTP Details
    otp: {
      type: String,
    },
    isOtpExpired: {
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

    // Operational Data
    operationalData: {
      totalDeliveries: {
        type: Number,
        default: 0,
      },
      completedDeliveries: {
        type: Number,
        default: 0,
      },
      canceledDeliveries: {
        type: Number,
        default: 0,
      },
      rating: {
        average: {
          type: Number,
          default: 0,
        },
        totalReviews: {
          type: Number,
          default: 0,
        },
      },
      vehicleType: {
        type: String,
        enum: ['BIKE', 'CAR', 'SCOOTER', 'BICYCLE', 'OTHER'],
      },
      licenseNumber: {
        type: String,
        default: '',
      },
    },

    // Bank Details
    bankDetails: {
      bankName: {
        type: String,
        default: '',
      },
      accountHolderName: {
        type: String,
        default: '',
      },
      iban: {
        type: String,
        default: '',
      },
      swiftCode: {
        type: String,
        default: '',
      },
    },

    // Earnings
    earnings: {
      totalEarnings: {
        type: Number,
        default: 0,
      },
      pendingEarnings: {
        type: Number,
        default: 0,
      },
    },

    // Documents
    documents: {
      idProof: {
        type: String,
        default: '',
      },
      addressProof: {
        type: String,
        default: '',
      },
      vehicleRegistration: {
        type: String,
        default: '',
      },
    },

    // Security & Access
    twoFactorEnabled: {
      type: Boolean,
      default: false,
    },
    loginDevices: [{ deviceId: String, lastLogin: Date }],

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
  },
  {
    timestamps: true,
    virtuals: true,
  }
);

deliveryPartnerSchema.plugin(passwordPlugin);

export const DeliveryPartner = model<
  TDeliveryPartner,
  IUserModel<TDeliveryPartner>
>('DeliveryPartner', deliveryPartnerSchema);
