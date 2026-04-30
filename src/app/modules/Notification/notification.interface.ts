import { TUserRole } from '../../constant/user.constant';

export type TNotificationType =
  | 'ORDER'
  | 'SYSTEM'
  | 'PROMO'
  | 'PAYOUT'
  | 'ACCOUNT'
  | 'PAYOUT_ALERT'
  | 'OTHER';

export type TNotification = {
  _id?: string;
  receiverId: string;
  receiverRole: TUserRole;
  title: string;
  message: string;
  data?: Record<string, string>; // optional metadata
  type?: TNotificationType;
  isRead: boolean;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
};
