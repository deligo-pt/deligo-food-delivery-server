import { Schema, model } from 'mongoose';
import { AGREEMENT_STATUS, TAgreement } from './agreement.interface';

const agreementSchema = new Schema<TAgreement>(
  {
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

    phone: {
      type: String,
      required: true,
      trim: true,
    },

    nif: {
      type: String,
      required: true,
      trim: true,
    },

    draftPdfPath: {
      type: String,
      required: true,
    },

    signaturePath: {
      type: String,
      default: null,
    },

    signedPdfPath: {
      type: String,
      default: null,
    },

    status: {
      type: String,
      enum: Object.values(AGREEMENT_STATUS),
      default: AGREEMENT_STATUS.DRAFT,
    },

    signedAt: {
      type: Date,
      default: null,
    },

    emailedAt: {
      type: Date,
      default: null,
    },

    vendor: {
      type: Schema.Types.ObjectId,
      ref: 'Vendor',
      default: null,
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

export const Agreement = model<TAgreement>('Agreement', agreementSchema);
