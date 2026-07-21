import mongoose, { Schema, model } from 'mongoose';

const emailLogSchema = new Schema(
  {
    to: { type: String, default: 'unknown@invalid.local', index: true },
    subject: { type: String, default: '(no-subject)' },
    status: {
      type: String,
      enum: ['SUCCESS', 'FAILED'],
      required: true,
      index: true,
    },

    providerMessageId: { type: String, default: '' },
    providerResponse: { type: String, default: '' },

    errorMessage: { type: String, default: '' },
    errorCode: { type: String, default: '' },
    errorStack: { type: String, default: '' },
  },
  { timestamps: true },
);

export const EmailLog =
  (mongoose.models.EmailLog as mongoose.Model<unknown>) ||
  model('EmailLog', emailLogSchema);
