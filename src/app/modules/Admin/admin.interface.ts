import { USER_STATUS } from '../../constant/user.constant';
import { TGeoJSONPoint } from '../../constant/GlobalInterface/global.interface';

export type TAdmin = {
  // ------------------------------------------------------------------
  // Core Identifiers
  // ------------------------------------------------------------------
  _id: string;
  authUserId: string;
  customUserId: string;
  role: 'ADMIN' | 'SUPER_ADMIN';
  email: string;
  status: keyof typeof USER_STATUS;
  isUpdateLocked: boolean;
  isDeleted: boolean;

  currentSessionLocation?: TGeoJSONPoint;

  // --------------------------------------------------------
  // Personal details
  // --------------------------------------------------------
  name?: {
    firstName?: string;
    lastName?: string;
  };
  contactNumber?: string;
  profilePhoto?: string;
  address?: {
    city?: string;
    longitude?: number;
    latitude?: number;
  };

  // ------------------------------------------------------------------
  // Permissions & Role Controls
  // ------------------------------------------------------------------
  permissions?: string[];
  // Example: ['MANAGE_USERS', 'APPROVE_VENDORS']

  // ------------------------------------------------------------------
  // Timestamps
  // ------------------------------------------------------------------
  createdAt?: Date;
  updatedAt?: Date;
};
