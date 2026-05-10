import { Types } from 'mongoose';

export const AGREEMENT_STATUS = {
  DRAFT: 'draft',
  SIGNED: 'signed',
  EMAILED: 'emailed',
} as const;

export type TAgreementStatus =
  (typeof AGREEMENT_STATUS)[keyof typeof AGREEMENT_STATUS];

export type TAgreement = {
  _id?: Types.ObjectId;

  // Business Information
  establishmentName: string;
  email: string;
  phone: string;
  nif: string;

  // File Paths
  draftPdfPath: string;
  signaturePath?: string | null;
  signedPdfPath?: string | null;

  // Status
  status: TAgreementStatus;

  // Dates
  signedAt?: Date | null;
  emailedAt?: Date | null;

  // Optional Relations
  vendor?: Types.ObjectId | null;
  createdBy?: Types.ObjectId | null;

  // Timestamps
  createdAt?: Date;
  updatedAt?: Date;
};
