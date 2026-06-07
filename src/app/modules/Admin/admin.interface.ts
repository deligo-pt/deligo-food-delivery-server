import mongoose from 'mongoose';
import { USER_STATUS } from '../../constant/GlobalConstant/user.constant';
import { TGeoJSONPoint } from '../../constant/GlobalInterface/location.interface';
import { TLoginDevice } from '../../constant/GlobalInterface/user.interface';

export type TAdmin = {
  // ------------------------------------------------------------------
  // Core Identifiers
  // ------------------------------------------------------------------
  _id: string;
  userId: string;
  registeredBy?: mongoose.Types.ObjectId;
  role: 'ADMIN' | 'SUPER_ADMIN';
  email: string;
  status: keyof typeof USER_STATUS;
  isDeleted: boolean;
  isUpdateLocked: boolean;

  // ------------------------------------------------------------------
  // Personal Information
  // ------------------------------------------------------------------
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

  NIF?: string;

  currentSessionLocation?: TGeoJSONPoint;

  // ---------------------------------------------
  // Documents & Verification
  // ---------------------------------------------
  documents?: {
    myPhoto?: string;
    idProofFront?: string;
    idProofBack?: string;
  };

  // ------------------------------------------------------------------
  // Permissions & Role Controls
  // ------------------------------------------------------------------
  permissions: string[];
  // Example: ['MANAGE_USERS', 'APPROVE_VENDORS']

  // ------------------------------------------------------------------
  // Admin Workflow & Audit Logs
  // ------------------------------------------------------------------
  approvedBy?: mongoose.Types.ObjectId;
  rejectedBy?: mongoose.Types.ObjectId;
  blockedBy?: mongoose.Types.ObjectId;

  submittedForApprovalAt?: Date;
  approvedOrRejectedOrBlockedAt?: Date;

  remarks?: string;

  // ------------------------------------------------------------------
  // Timestamps
  // ------------------------------------------------------------------
  createdAt?: Date;
  updatedAt?: Date;
};
