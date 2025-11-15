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
    userId: { type: String, required: true, unique: true },
    registeredBy: { type: String },
    role: {
      type: String,
      enum: ['DELIVERY_PARTNER'],
      required: true,
    },
    email: {
      type: String,
      required: true,
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
    isEmailVerified: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },

    // FCM tokens for push notifications
    fcmTokens: {
      type: [String],
      default: [],
    },

    // OTP
    otp: { type: String },
    isOtpExpired: { type: Date },

    // 1) Personal Information (Portugal Required)
    personalInfo: {
      Name: {
        firstName: { type: String, default: '' },
        lastName: { type: String, default: '' },
      },
      dateOfBirth: { type: Date },
      gender: { type: String, enum: ['MALE', 'FEMALE', 'OTHER'] },
      nationality: { type: String, default: '' },
      nifNumber: { type: String, default: '' },
      citizenCardNumber: { type: String, default: '' },
      passportNumber: { type: String, default: '' },
      idExpiryDate: { type: Date },
      idDocumentFront: { type: String, default: '' },
      idDocumentBack: { type: String, default: '' },
      address: {
        street: { type: String, default: '' },
        city: { type: String, default: '' },
        state: { type: String, default: '' },
        country: { type: String, default: '' },
        zipCode: { type: String, default: '' },
      },
      contactNumber: { type: String, default: '' },
    },
    profilePhoto: { type: String, default: '' },
    passwordChangedAt: { type: Date },

    // 2) Right to Work / Legal Status
    legalStatus: {
      residencePermitType: { type: String, default: '' },
      residencePermitNumber: { type: String, default: '' },
      residencePermitExpiry: { type: Date },
    },

    // 3) Payment & Banking Details
    bankDetails: {
      bankName: { type: String, default: '' },
      accountHolderName: { type: String, default: '' },
      iban: { type: String, default: '' },
      swiftCode: { type: String, default: '' },
    },

    // 4) Vehicle Information
    vehicleInfo: {
      vehicleType: {
        type: String,
        enum: ['BICYCLE', 'E-BIKE', 'SCOOTER', 'MOTORBIKE', 'CAR'],
      },
      brand: { type: String, default: '' },
      model: { type: String, default: '' },
      licensePlate: { type: String, default: '' },
      drivingLicenseNumber: { type: String, default: '' },
      drivingLicenseExpiry: { type: Date },
      insurancePolicyNumber: { type: String, default: '' },
      insuranceExpiry: { type: Date },
    },

    // 5) Criminal Background
    criminalRecord: {
      certificate: { type: Boolean },
      issueDate: { type: Date },
    },

    // 6) Work Preferences
    workPreferences: {
      preferredZones: { type: [String], default: [] },
      preferredHours: { type: [String], default: [] },
      hasEquipment: {
        isothermalBag: { type: Boolean, default: false },
        helmet: { type: Boolean, default: false },
        powerBank: { type: Boolean, default: false },
      },
      workedWithOtherPlatform: { type: Boolean, default: false },
      otherPlatformName: { type: String, default: '' },
    },

    // Operational Data
    operationalData: {
      totalDeliveries: { type: Number, default: 0 },
      completedDeliveries: { type: Number, default: 0 },
      canceledDeliveries: { type: Number, default: 0 },
      rating: {
        average: { type: Number, default: 0 },
        totalReviews: { type: Number, default: 0 },
      },
    },

    // Earnings
    earnings: {
      totalEarnings: { type: Number, default: 0 },
      pendingEarnings: { type: Number, default: 0 },
    },

    // Documents
    documents: {
      idProof: { type: String, default: '' },
      drivingLicense: { type: String, default: '' },
      vehicleRegistration: { type: String, default: '' },
    },

    // Security & Access
    twoFactorEnabled: { type: Boolean, default: false },
    loginDevices: [{ deviceId: String, lastLogin: Date }],

    // Admin & Audit
    approvedBy: { type: String, default: '' },
    rejectedBy: { type: String, default: '' },
    blockedBy: { type: String, default: '' },
    submittedForApprovalAt: { type: Date, default: null },
    approvedOrRejectedOrBlockedAt: { type: Date, default: null },
    remarks: { type: String, default: '' },
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
