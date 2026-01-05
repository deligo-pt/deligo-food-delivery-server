/* eslint-disable no-useless-escape */
import { Schema, model } from 'mongoose';
import { TDeliveryPartner } from './delivery-partner.interface';
import { IUserModel } from '../../interfaces/user.interface';
import { passwordPlugin } from '../../plugins/passwordPlugin';
import { loginDeviceSchema, USER_STATUS } from '../../constant/user.constant';
import { currentStatusOptions } from './delivery-partner.constant';

export const locationSchema = new Schema(
  {
    type: { type: String, enum: ['Point'], default: 'Point', required: true },
    coordinates: { type: [Number], required: true }, // [longitude, latitude]
    accuracy: { type: Number }, // GPS Accuracy in meters
    lastLocationUpdate: { type: Date, default: Date.now, required: true }, // Data Freshness Timestamp
  },
  { _id: false }
);

const deliveryPartnerSchema = new Schema<
  TDeliveryPartner,
  IUserModel<TDeliveryPartner>
>(
  {
    //-------------------------------------------------
    // Core Identifiers
    //-------------------------------------------------
    userId: { type: String, required: true, unique: true },
    registeredBy: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'FleetManager',
    },

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
      select: false,
    },

    status: {
      type: String,
      enum: Object.keys(USER_STATUS),
      default: USER_STATUS.PENDING,
    },

    isEmailVerified: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
    isUpdateLocked: { type: Boolean, default: false },

    //-------------------------------------------------
    // FCM Tokens
    //-------------------------------------------------
    fcmTokens: { type: [String], default: [] },

    // --------------------------------------------------------
    // Pending temporary Email and contact number
    // --------------------------------------------------------
    pendingEmail: { type: String },
    pendingContactNumber: { type: String },

    //-------------------------------------------------
    // OTP & Password Reset
    //-------------------------------------------------
    otp: { type: String },
    isOtpExpired: { type: Date },
    passwordResetToken: { type: String },
    passwordResetTokenExpiresAt: { type: Date },
    passwordChangedAt: { type: Date },

    //-------------------------------------------------
    // Personal Information
    //-------------------------------------------------
    name: {
      firstName: { type: String, default: '' },
      lastName: { type: String, default: '' },
    },
    contactNumber: { type: String, default: '' },
    profilePhoto: { type: String, default: '' },
    address: {
      street: { type: String, default: '' },
      city: { type: String, default: '' },
      state: { type: String, default: '' },
      country: { type: String, default: '' },
      postalCode: { type: String, default: '' },
      longitude: { type: Number },
      latitude: { type: Number },
      geoAccuracy: { type: Number },
    },

    // operational address
    operationalAddress: {
      street: { type: String, default: '' },
      city: { type: String, default: '' },
      state: { type: String, default: '' },
      country: { type: String, default: '' },
      postalCode: { type: String, default: '' },
      longitude: { type: Number },
      latitude: { type: Number },
      geoAccuracy: { type: Number },
    },
    //-------------------------------------------------
    // Live Location (UPDATED for Geo-Search)
    //-------------------------------------------------
    currentSessionLocation: { type: locationSchema },

    personalInfo: {
      dateOfBirth: { type: Date },
      gender: { type: String, enum: ['MALE', 'FEMALE', 'OTHER'] },
      nationality: { type: String, default: '' },

      NIF: { type: String, default: '' },
      citizenCardNumber: { type: String, default: '' },
      passportNumber: { type: String, default: '' },
      idExpiryDate: { type: Date },
    },

    //-------------------------------------------------
    // Legal Status
    //-------------------------------------------------
    legalStatus: {
      residencePermitType: { type: String, default: '' },
      residencePermitNumber: { type: String, default: '' },
      residencePermitExpiry: { type: Date },
    },

    //-------------------------------------------------
    // Banking Details
    //-------------------------------------------------
    bankDetails: {
      bankName: { type: String, default: '' },
      accountHolderName: { type: String, default: '' },
      iban: { type: String, default: '' },
      swiftCode: { type: String, default: '' },
    },

    //-------------------------------------------------
    // Vehicle Information
    //-------------------------------------------------
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

    //-------------------------------------------------
    // Criminal Background
    //-------------------------------------------------
    criminalRecord: {
      certificate: { type: Boolean },
      issueDate: { type: Date },
    },

    //-------------------------------------------------
    // Work Preferences
    //-------------------------------------------------
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

    //-------------------------------------------------
    // Operational Data (Statistics)
    //-------------------------------------------------
    operationalData: {
      totalDeliveries: { type: Number, default: 0 },
      completedDeliveries: { type: Number, default: 0 },
      canceledDeliveries: { type: Number, default: 0 },
      rating: {
        average: { type: Number, default: 0 },
        totalReviews: { type: Number, default: 0 },
      },
      currentStatus: {
        type: String,
        enum: Object.keys(currentStatusOptions),
        default: 'OFFLINE',
        required: true,
      },
      assignmentZoneId: {
        type: Schema.Types.ObjectId,
        default: null,
        ref: 'Zone',
      },
      currentZoneId: {
        type: Schema.Types.ObjectId,
        default: null,
        ref: 'Zone',
      }, // DeliGo Zone ID
      currentOrderId: {
        type: Schema.Types.ObjectId,
        default: null,
        ref: 'Order',
      }, // List of active order IDs
      capacity: { type: Number, required: true, default: 1 }, // Max number of orders the driver can carry
      isWorking: { type: Boolean, default: false }, // Clocked in/out status

      lastActivityAt: { type: Date },
    },

    //-------------------------------------------------
    // Earnings
    //-------------------------------------------------
    earnings: {
      totalEarnings: { type: Number, default: 0 },
      pendingEarnings: { type: Number, default: 0 },
    },

    //-------------------------------------------------
    // Documents
    //-------------------------------------------------
    documents: {
      idProofFront: { type: String, default: '' },
      idProofBack: { type: String, default: '' },
      drivingLicenseFront: { type: String, default: '' },
      drivingLicenseBack: { type: String, default: '' },
      vehicleRegistration: { type: String, default: '' },
      criminalRecordCertificate: { type: String, default: '' },
    },

    //-------------------------------------------------
    // Security & Access
    //-------------------------------------------------
    twoFactorEnabled: { type: Boolean, default: false },

    loginDevices: {
      type: [loginDeviceSchema],
      default: [],
    },

    //-------------------------------------------------
    // Admin Workflow / Audit
    //-------------------------------------------------
    approvedBy: { type: Schema.Types.ObjectId, default: null, ref: 'Admin' },
    rejectedBy: { type: Schema.Types.ObjectId, default: null, ref: 'Admin' },
    blockedBy: { type: Schema.Types.ObjectId, default: null, ref: 'Admin' },

    submittedForApprovalAt: { type: Date, default: null },
    approvedOrRejectedOrBlockedAt: { type: Date, default: null },

    remarks: { type: String, default: '' },
  },
  {
    timestamps: true,
    virtuals: true,
  }
);

// --- Indexing and Plugins ---
deliveryPartnerSchema.index({
  currentSessionLocation: '2dsphere',
});
deliveryPartnerSchema.plugin(passwordPlugin);

export const DeliveryPartner = model<
  TDeliveryPartner,
  IUserModel<TDeliveryPartner>
>('DeliveryPartner', deliveryPartnerSchema);
