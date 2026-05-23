/* eslint-disable no-useless-escape */
import { Schema, model } from 'mongoose';
import { TDeliveryPartner } from './delivery-partner.interface';
import { USER_STATUS } from '../../constant/GlobalConstant/user.constant';
import { currentStatusOptions } from './delivery-partner.constant';
import { liveLocationSchema } from '../../constant/GlobalModel/location.model';

const deliveryPartnerSchema = new Schema<TDeliveryPartner>(
  {
    //-------------------------------------------------
    // Core Identifiers
    //-------------------------------------------------
    userCustomId: { type: String, required: true, unique: true },
    registeredBy: {
      id: {
        type: Schema.Types.ObjectId,
        refPath: 'registeredBy.model',
      },
      model: {
        type: String,
        enum: ['Admin', 'FleetManager'],
      },
      role: {
        type: String,
        enum: ['ADMIN', 'SUPER_ADMIN', 'FLEET_MANAGER'],
      },
    },

    status: {
      type: String,
      enum: Object.keys(USER_STATUS),
      default: USER_STATUS.PENDING,
    },

    isUpdateLocked: { type: Boolean, default: false },

    // --------------------------------------------------------
    // Pending temporary Email and contact number
    // --------------------------------------------------------
    pendingEmail: { type: String },
    pendingContactNumber: { type: String },

    //-------------------------------------------------
    // Personal Information
    //-------------------------------------------------
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
      longitude: { type: Number },
      latitude: { type: Number },
      geoAccuracy: { type: Number },
      detailedAddress: { type: String, default: '' },
    },

    //-------------------------------------------------
    // Live Location (UPDATED for Geo-Search)
    //-------------------------------------------------
    currentSessionLocation: { type: liveLocationSchema },

    personalInfo: {
      dateOfBirth: { type: Date },
      gender: { type: String, enum: ['MALE', 'FEMALE', 'OTHER'] },
      nationality: { type: String, default: '' },

      NIF: { type: String, default: '' },
      passportNumber: { type: String, default: '' },
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
      expiryDate: { type: Date },
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

      totalOfferedOrders: { type: Number, default: 0 },
      totalAcceptedOrders: { type: Number, default: 0 },
      totalRejectedOrders: { type: Number, default: 0 },
      totalDeliveryMinutes: { type: Number, default: 0 },

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
    // Documents
    //-------------------------------------------------
    documents: {
      myPhoto: { type: String, default: '' },
      idProofFront: { type: String, default: '' },
      idProofBack: { type: String, default: '' },
      drivingLicenseFront: { type: String, default: '' },
      drivingLicenseBack: { type: String, default: '' },
      vehicleRegistration: { type: String, default: '' },
      criminalRecordCertificate: { type: String, default: '' },
      activity: { type: String, default: '' },
      insurancePolicy: { type: String, default: '' },
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

    rating: {
      average: { type: Number, default: 0 },
      totalReviews: { type: Number, default: 0 },
    },
  },
  {
    timestamps: true,
    virtuals: true,
  },
);

// --- Indexing and Plugins ---
deliveryPartnerSchema.index({
  currentSessionLocation: '2dsphere',
});
deliveryPartnerSchema.index({ 'registeredBy.id': 1 });

export const DeliveryPartner = model<TDeliveryPartner>(
  'DeliveryPartner',
  deliveryPartnerSchema,
);
