import { TUserRole } from '../../constant/user.constant';

export type TNotificationType =
  | 'ORDER'
  | 'OFFER'
  | 'SYSTEM'
  | 'PAYOUT'
  | 'ACCOUNT'
  | 'PAYOUT_ALERT'
  | 'TRANSACTION'
  | 'PROMOTIONAL'
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

export type TBroadcastNotificationPayload = {
  communicationType: 'EMAIL' | 'PUSH' | 'BOTH';
  targetAudience:
    | 'CUSTOMER'
    | 'DELIVERY_PARTNER'
    | 'VENDOR'
    | 'SUB_VENDOR'
    | 'FLEET_MANAGER';
  customUserIds?: string[];
  title: string;
  body: string;
  imageUrl?: string;
  data?: Record<string, string>; // optional metadata
  type?: TNotificationType;
};
