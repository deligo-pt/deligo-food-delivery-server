import mongoose from 'mongoose';
import { USER_STATUS } from '../../constant/GlobalConstant/user.constant';
import { TGeoJSONPoint } from '../../constant/GlobalInterface/location.interface';

export type TFleetManager = {
  // ---------------------------------------------
  // Core Identifiers
  // ---------------------------------------------
  _id?: mongoose.Types.ObjectId;
  userId: string;
  registeredBy?: mongoose.Types.ObjectId;

  isUpdateLocked: boolean;

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

  rating?: {
    average: number;
    totalReviews: number;
  };

  isDeleted?: boolean;

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
