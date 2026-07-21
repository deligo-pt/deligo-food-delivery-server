import { model, Schema } from 'mongoose';
import { activityTypes, TActivityLog } from './activityLog.interface';

const activityLogSchema = new Schema<TActivityLog>(
  {
    authUserId: {
      type: Schema.Types.ObjectId,
      ref: 'AuthUser',
      required: true,
    },
    userName: { type: String, required: true },
    email: { type: String, required: true },
    role: { type: String, required: true },
    action: { type: String, required: true },
    target: { type: String, default: '' },
    type: {
      type: String,
      enum: activityTypes,
      default: 'INFO',
    },
  },
  { timestamps: true },
);

export const ActivityLog = model<TActivityLog>(
  'ActivityLog',
  activityLogSchema,
);
