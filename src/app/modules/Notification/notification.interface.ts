import { USER_ROLE } from '../../constant/user.const';

export type TNotification = {
  _id?: string;
  receiverId: string; // userId of who received it
  receiverRole: keyof typeof USER_ROLE;
  title: string;
  message: string;
  data?: Record<string, string>; // optional metadata
  type?: 'ORDER' | 'SYSTEM' | 'PROMO' | 'ACCOUNT' | 'OTHER';
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
};
