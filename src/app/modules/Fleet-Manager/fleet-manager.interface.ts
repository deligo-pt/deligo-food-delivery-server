import { USER_STATUS } from '../../constant/user.constant';
import { TGeoJSONPoint } from '../../constant/GlobalInterface/global.interface';

export type TFleetManager = {
  // ---------------------------------------------
  // Core Identifiers
  // ---------------------------------------------
  _id?: string;
  authUserId: string;
  customUserId: string;
  role: 'FLEET_MANAGER';
  email: string;
  password: string;
  status: keyof typeof USER_STATUS;
  isUpdateLocked: boolean;

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
  // Operational Data
  // ---------------------------------------------
  operationalData?: {
    totalDrivers: number;
    activeVehicles?: number;
    totalDeliveries?: number;
  };

  // --------------------------------------------------------
  // Rating & Activity
  // --------------------------------------------------------
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
  docImageTitle: 'idProofFront' | 'idProofBack' | 'businessLicense';
};
