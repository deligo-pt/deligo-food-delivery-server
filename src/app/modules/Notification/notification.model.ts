import { Schema, model } from 'mongoose';
import { TNotification } from './notification.interface';
import { USER_ROLE } from '../../constant/user.const';

const notificationSchema = new Schema<TNotification>(
  {
    receiverId: { type: String, required: true },
    receiverRole: {
      type: String,
      enum: Object.values(USER_ROLE),
      required: true,
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    data: { type: Object },
    type: {
      type: String,
      enum: ['ORDER', 'SYSTEM', 'PROMO', 'ACCOUNT', 'OTHER'],
      default: 'OTHER',
    },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const Notification = model<TNotification>(
  'Notification',
  notificationSchema
);
