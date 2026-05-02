import { Schema, model } from 'mongoose';

const requestLogSchema = new Schema({
  ip: { type: String, required: true },
  method: { type: String },
  path: { type: String },
  userAgent: { type: String },
  headers: { type: Object },
  timestamp: {
    type: Date,
    default: Date.now,
    index: { expires: '7d' },
  },
});

export const RequestLog = model('RequestLog', requestLogSchema);
