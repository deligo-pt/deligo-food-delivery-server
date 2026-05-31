import mongoose from 'mongoose';
import { USER_STATUS } from '../../constant/GlobalConstant/user.constant';
import { TGeoJSONPoint } from '../../constant/GlobalInterface/location.interface';

export type TAdmin = {
  // ------------------------------------------------------------------
  // Core Identifiers
  // ------------------------------------------------------------------
  _id: mongoose.Types.ObjectId;
  userId: string;
  registeredBy?: mongoose.Types.ObjectId;
  status: keyof typeof USER_STATUS;
  isUpdateLocked: boolean;

  // --------------------------------------------------------
  // Pending temporary Email and contact number
  // --------------------------------------------------------
  pendingEmail?: string;
  pendingContactNumber?: string;

  // ------------------------------------------------------------------
  // Personal Information
  // ------------------------------------------------------------------
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

  NIF?: string;

  currentSessionLocation?: TGeoJSONPoint;

  // ---------------------------------------------
  // Documents & Verification
  // ---------------------------------------------
  documents?: {
    idProofFront?: string;
    idProofBack?: string;
  };

  isDeleted?: boolean;

  // ------------------------------------------------------------------
  // Timestamps
  // ------------------------------------------------------------------
  createdAt?: Date;
  updatedAt?: Date;
};
