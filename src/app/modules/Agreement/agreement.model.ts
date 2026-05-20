import { Schema, model } from 'mongoose';
import { AGREEMENT_STATUS, TAgreement } from './agreement.interface';

const agreementSchema = new Schema<TAgreement>(
  {
    // ------------------------------------------------------------------
    // Business Information
    // ------------------------------------------------------------------
    establishmentName: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },

    contactNumber: {
      type: String,
      required: true,
      trim: true,
    },

    nif: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    // ------------------------------------------------------------------
    // Email Verification
    // ------------------------------------------------------------------
    isEmailVerified: {
      type: Boolean,
      default: false,
    },

    emailVerifiedAt: {
      type: Date,
      default: null,
    },

    // ------------------------------------------------------------------
    // File Paths
    // ------------------------------------------------------------------
    draftPdfPath: {
      type: String,
      default: null,
    },

    signaturePath: {
      type: String,
      default: null,
    },

    signedPdfPath: {
      type: String,
      default: null,
    },

    // ------------------------------------------------------------------
    // Status
    // ------------------------------------------------------------------
    status: {
      type: String,
      enum: Object.values(AGREEMENT_STATUS),
      default: AGREEMENT_STATUS.PENDING_VERIFICATION,
    },

    // ------------------------------------------------------------------
    // Lifecycle Dates
    // ------------------------------------------------------------------
    signedAt: {
      type: Date,
      default: null,
    },

    emailedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

// Optional: prevent duplicate agreements per email
agreementSchema.index(
  { email: 1 },
  {
    unique: true,
  },
);

export const Agreement = model<TAgreement>('Agreement', agreementSchema);
