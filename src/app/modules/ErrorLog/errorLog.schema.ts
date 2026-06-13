import { Schema, model } from 'mongoose';

const errorLogSchema = new Schema(
  {
    message: { type: String, required: true },
    stack: { type: String },
    statusCode: { type: Number, default: 500 },
    userId: { type: String, default: null },
    requestDetails: {
      method: { type: String },
      url: { type: String },
      ip: { type: String },
      body: { type: Schema.Types.Mixed },
    },
    createdAt: { type: Date, default: Date.now, expires: '30d' },
  },
  {
    timestamps: true,
  },
);

export const ErrorLog = model('ErrorLog', errorLogSchema);
