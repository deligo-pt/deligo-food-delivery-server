/* eslint-disable no-unused-vars */
import { Model } from 'mongoose';

export type TVendor = {
  // 1. Personal Details
  _id?: string;
  userId: string;
  // 2. Business Details
  businessDetails?: {
    businessName: string;
    businessType: string; // Restaurant | Grocery | Pharmacy etc.
    businessLicenseNumber?: string;
    NIF?: string; // Tax Identification Number
    city: string;
    postalCode: string;
    location: {
      address?: string;
      latitude?: number;
      longitude?: number;
    };
    openingHours?: string; // Ex: "09:00 AM"
    closingHours?: string; // Ex: "11:00 PM"
    closingDays?: string[]; // ["Friday", "Public Holidays"]
  };
  // 3. Bank & Payment Information
  bankDetails?: {
    bankName: string;
    accountHolderName: string;
    iban?: string;
    swiftCode?: string;
  };
  // 4. Documents & Verification
  documents?: {
    businessLicenseDoc?: string;
    taxDoc?: string;
    idProof?: string;
    storePhoto?: string;
    menuUpload?: string;
  };
  createdAt?: Date;
  updatedAt?: Date;
};

export interface IVendorModel extends Model<TVendor> {
  isVendorExistsByEmail(id: string): Promise<TVendor>;
  isPasswordMatched(
    plainTextPassword: string,
    hashedPassword: string
  ): Promise<boolean>;
  isJWTIssuedBeforePasswordChanged(
    passwordChangedTimestamp: Date,
    jwtIssuedTimestamp: number
  ): boolean;
}
