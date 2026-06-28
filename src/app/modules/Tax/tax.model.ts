import { Schema, model } from 'mongoose';
import { TTax } from './tax.interface';
import { localizedSchema } from '../../constant/GlobalModel/language.model';

const taxSchema = new Schema<TTax>(
  {
    taxName: {
      type: localizedSchema,
      required: true,
    },
    description: {
      type: localizedSchema,
      required: true,
    },
    taxCode: {
      type: String,
      required: [true, 'Tax Code is required'],
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
    taxExemptionCode: {
      type: String,
      default: '',
    },
    taxExemptionReason: {
      type: localizedSchema,
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

const validateZeroTaxCompliance = (doc: any) => {
  if (doc.taxRate === 0) {
    const reason = doc.taxExemptionReason;
    const hasReasonText = reason && (reason.en?.trim() || reason.pt?.trim());

    if (!doc.taxExemptionCode?.trim() || !hasReasonText) {
      throw new Error(
        'Tax rate 0 requires a valid TaxExemptionCode and Localized Reason for Portuguese law.',
      );
    }
  }
};

taxSchema.pre('save', function (next) {
  try {
    validateZeroTaxCompliance(this);
    next();
  } catch (error: any) {
    next(error);
  }
});

taxSchema.pre('findOneAndUpdate', function (next) {
  try {
    const updatePayload = this.getUpdate() as any;

    const data = updatePayload.$set || updatePayload;

    if (data.taxRate === 0) {
      validateZeroTaxCompliance(data);
    }
    next();
  } catch (error: any) {
    next(error);
  }
});

export const Tax = model<TTax>('Tax', taxSchema);
