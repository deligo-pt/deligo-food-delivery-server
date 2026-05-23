import mongoose from 'mongoose';
import { USER_STATUS } from '../../constant/GlobalConstant/user.constant';
import { TGeoJSONPoint } from '../../constant/GlobalInterface/location.interface';

export type TFleetManager = {
  // ---------------------------------------------
  // Core Identifiers
  // ---------------------------------------------
  _id?: mongoose.Types.ObjectId;
  userCustomId: string;
  registeredBy?: mongoose.Types.ObjectId;

  status: keyof typeof USER_STATUS;
  isUpdateLocked: boolean;

  // --------------------------------------------------------
  // Pending temporary Email and contact number
  // --------------------------------------------------------
  pendingEmail?: string;
  pendingContactNumber?: string;

  // ---------------------------------------------
  // Personal Information
  // ---------------------------------------------
  name?: {
    firstName?: string;
    lastName?: string;
  };

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

  currentSessionLocation?: TGeoJSONPoint;

  // ---------------------------------------------
  // Business Details
  // ---------------------------------------------
  businessDetails?: {
    businessName: string;
    businessLicenseNumber?: string;
    NIF?: string;
    totalBranches?: number;
  };

  businessLocation?: {
    street: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
    latitude?: number;
    longitude?: number;
    geoAccuracy?: number;
  };

  // ---------------------------------------------
  // Bank & Payment Information
  // ---------------------------------------------
  bankDetails?: {
    bankName: string;
    accountHolderName: string;
    iban: string;
    swiftCode: string;
  };

  // ---------------------------------------------
  // Documents & Verification
  // ---------------------------------------------
  documents?: {
    myPhoto?: string[];
    idProofFront?: string[];
    idProofBack?: string[];
    businessLicense?: string[];
  };

  // ---------------------------------------------
  // Operational Data
  // ---------------------------------------------
  operationalData?: {
    totalDrivers: number;
    activeVehicles?: number;
    totalDeliveries?: number;
  };

  // ---------------------------------------------
  // Admin Workflow / Audit
  // ---------------------------------------------
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

  // ---------------------------------------------
  // Timestamps
  // ---------------------------------------------
  createdAt: Date;
  updatedAt: Date;
};

export type TFleetManagerImageDocuments = {
  docImageTitle: 'myPhoto' | 'idProofFront' | 'idProofBack' | 'businessLicense';
  docImageUrls: string[];
};
