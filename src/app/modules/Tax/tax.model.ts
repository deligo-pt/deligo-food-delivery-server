import { Schema, model } from 'mongoose';
import { TTax } from './tax.interface';

const taxSchema = new Schema<TTax>(
  {
    taxName: {
      type: String,
      required: [true, 'Tax name is required'],
      trim: true,
    },
    taxCode: {
      type: String,
      required: [true, 'Sage Tax Code is required'],
      enum: ['NOR', 'INT', 'RED', 'ISE'],
      uppercase: true,
    },
    taxRate: {
      type: Number,
      required: true,
      enum: [6, 13, 23, 0],
    },
    countryID: {
      type: String,
      default: 'PRT',
      uppercase: true,
    },
    TaxRegionID: {
      type: String,
      default: 'PRT',
    },
    taxGroupID: {
      type: String,
      default: 'IVA',
    },
    description: {
      type: String,
      required: [true, 'Description is mandatory for compliance'],
      trim: true,
    },
    taxExemptionCode: {
      type: String,
      default: '',
    },
    taxExemptionReason: {
      type: String,
      default: '',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

taxSchema.pre('save', function (next) {
  if (this.taxRate === 0) {
    if (!this.taxExemptionCode || !this.taxExemptionReason) {
      return next(
        new Error(
          'Tax rate 0 requires a TaxExemptionCode and Reason for Portuguese law.',
        ),
      );
    }
  }
  next();
});

export const Tax = model<TTax>('Tax', taxSchema);
