import mongoose from 'mongoose';
import { USER_STATUS } from '../../constant/GlobalConstant/user.constant';
import { TLoginDevice } from '../../constant/GlobalInterface/user.interface';
import { currentStatusOptions } from './delivery-partner.constant';
import { TGeoJSONPoint } from '../../constant/GlobalInterface/location.interface';

export type TRegisteredByModel = 'Admin' | 'FleetManager';
export type TDeliveryPartner = {
  // -------------------------------------------------
  // Core Identifiers & Credentials
  // -------------------------------------------------
  _id?: string;
  userId: string;
  registeredBy?: {
    id: mongoose.Types.ObjectId;
    model: TRegisteredByModel;
    role: 'ADMIN' | 'SUPER_ADMIN' | 'FLEET_MANAGER';
  };
  role: 'DELIVERY_PARTNER';
  email: string;
  status: keyof typeof USER_STATUS;
  isDeleted: boolean;
  isUpdateLocked: boolean;

  // -------------------------------------------------
  // 1) Personal Information
  // -------------------------------------------------
  name?: {
    firstName?: string;
    lastName?: string;
  };
  contactNumber?: string;
  profilePhoto?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
    longitude?: number;
    latitude?: number;
    geoAccuracy?: number;
    detailedAddress?: string;
  };

  // -------------------------------------------------
  // Live Location (Required for Geo-Search & Nearest Match)
  // -------------------------------------------------
  currentSessionLocation: TGeoJSONPoint;
  personalInfo?: {
    dateOfBirth?: Date;
    gender?: 'MALE' | 'FEMALE' | 'OTHER';
    nationality?: string;
    NIF?: string;
    passportNumber?: string;
  };

  // -------------------------------------------------
  // 2) Legal Status / Work Rights
  // -------------------------------------------------
  legalStatus?: {
    residencePermitType?: string;
    residencePermitNumber?: string;
    residencePermitExpiry?: Date;
  };

  // -------------------------------------------------
  // 3) Payment & Banking Details
  // -------------------------------------------------
  bankDetails?: {
    bankName?: string;
    accountHolderName?: string;
    iban?: string;
    swiftCode?: string;
  };

  // -------------------------------------------------
  // 4) Vehicle Information
  // -------------------------------------------------
  vehicleInfo?: {
    vehicleType?: 'BICYCLE' | 'E-BIKE' | 'SCOOTER' | 'MOTORBIKE' | 'CAR';
    brand?: string;
    model?: string;
    licensePlate?: string;
    drivingLicenseNumber?: string;
    drivingLicenseExpiry?: Date;
    insurancePolicyNumber?: string;
    insuranceExpiry?: Date;
  };

  // -------------------------------------------------
  // 5) Criminal Background
  // -------------------------------------------------
  criminalRecord?: {
    certificate?: boolean;
    issueDate?: Date;
    expiryDate?: Date;
  };

  // -------------------------------------------------
  // 6) Work Preferences & Equipment
  // -------------------------------------------------
  workPreferences?: {
    preferredZones?: string[];
    preferredHours?: string[];
    hasEquipment?: {
      isothermalBag?: boolean;
      helmet?: boolean;
      powerBank?: boolean;
    };
    workedWithOtherPlatform?: boolean;
    otherPlatformName?: string;
  };

  // -------------------------------------------------
  // 7) Operational Statistics
  // -------------------------------------------------
  operationalData?: {
    totalDeliveries?: number;
    completedDeliveries?: number;
    canceledDeliveries?: number;

    totalOfferedOrders?: number;
    totalAcceptedOrders?: number;
    totalRejectedOrders?: number;
    totalDeliveryMinutes?: number;

    currentStatus: keyof typeof currentStatusOptions; // Current working state (IDLE, ON_DELIVERY, OFFLINE)
    assignmentZoneId: mongoose.Types.ObjectId;
    currentZoneId?: mongoose.Types.ObjectId; // DeliGo Zone ID (e.g., 'Lisbon-Zone-02')
    currentOrderId?: mongoose.Types.ObjectId; // List of active order IDs they are currently fulfilling
    capacity: number; // Max number of orders the driver can carry (e.g., 2 or 3)
    isWorking: boolean; // Simple flag: Clocked in/out

    lastActivityAt?: Date;
  };

  // -------------------------------------------------
  // 9) Documents
  // -------------------------------------------------
  documents?: {
    myPhoto?: string;
    idProofFront?: string;
    idProofBack?: string;
    drivingLicenseFront?: string;
    drivingLicenseBack?: string;
    vehicleRegistration?: string;
    criminalRecordCertificate?: string;
    activity?: string;
    insurancePolicy?: string;
  };

  // -------------------------------------------------
  // 11) Admin Workflow (Approval System)
  // -------------------------------------------------
  approvedBy?: mongoose.Types.ObjectId;
  rejectedBy?: mongoose.Types.ObjectId;
  blockedBy?: mongoose.Types.ObjectId;
  submittedForApprovalAt?: Date;
  approvedOrRejectedOrBlockedAt?: Date;
  remarks?: string;

  rating?: {
    average: number;
    totalReviews: number;
  };

  // -------------------------------------------------
  // Timestamps
  // -------------------------------------------------
  createdAt?: Date;
  updatedAt?: Date;
};

// Document Upload Types (unchanged)
export type TDeliveryPartnerImageDocuments = {
  docImageTitle:
    | 'myPhoto'
    | 'idProofFront'
    | 'idProofBack'
    | 'drivingLicenseFront'
    | 'drivingLicenseBack'
    | 'vehicleRegistration'
    | 'criminalRecordCertificate';
};
