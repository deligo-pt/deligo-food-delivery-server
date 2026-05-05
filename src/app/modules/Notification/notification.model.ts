import { Schema, model } from 'mongoose';
import { TNotification } from './notification.interface';
import { USER_ROLE } from '../../constant/user.constant';

export const notificationTypes = [
  'ORDER',
  'OFFER',
  'SYSTEM',
  'PAYOUT',
  'ACCOUNT',
  'PAYOUT_ALERT',
  'TRANSACTION',
  'PROMOTIONAL',
  'OTHER',
];

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
      enum: notificationTypes,
      default: 'OTHER',
    },
    isRead: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export const Notification = model<TNotification>(
  'Notification',
  notificationSchema,
);
