import { Types } from 'mongoose';

export const AGREEMENT_STATUS = {
  PENDING_VERIFICATION: 'pending_verification',
  VERIFIED: 'verified',
  DRAFT: 'draft',
  SIGNED: 'signed',
  EMAILED: 'emailed',
} as const;

export type TAgreementStatus =
  (typeof AGREEMENT_STATUS)[keyof typeof AGREEMENT_STATUS];

export type TAgreement = {
  _id?: Types.ObjectId;

  // ------------------------------------------------------------------
  // Business Information
  // ------------------------------------------------------------------
  establishmentName: string;
  email: string;
  contactNumber: string;
  nif: string;

  // ------------------------------------------------------------------
  // Email Verification
  // ------------------------------------------------------------------
  isEmailVerified?: boolean;
  emailVerifiedAt?: Date | null;

  // ------------------------------------------------------------------
  // File Paths
  // ------------------------------------------------------------------
  draftPdfPath: string;
  signaturePath?: string | null;
  signedPdfPath?: string | null;

  // ------------------------------------------------------------------
  // Agreement Status
  // ------------------------------------------------------------------
  status: TAgreementStatus;

  // ------------------------------------------------------------------
  // Agreement Lifecycle Dates
  // ------------------------------------------------------------------
  signedAt?: Date | null;
  emailedAt?: Date | null;

  // ------------------------------------------------------------------
  // Actions
  // ------------------------------------------------------------------
  createdBy?: Types.ObjectId;

  // ------------------------------------------------------------------
  // Timestamps
  // ------------------------------------------------------------------
  createdAt?: Date;
  updatedAt?: Date;
};

export type TInitiateAgreementPayload = Pick<
  TAgreement,
  'establishmentName' | 'email' | 'contactNumber' | 'nif'
>;
