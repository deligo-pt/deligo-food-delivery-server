import { USER_ROLE } from '../../constant/user.constant';

export type TNotification = {
  _id?: string;
  receiverId: string;
  receiverRole: keyof typeof USER_ROLE;
  title: string;
  message: string;
  data?: Record<string, string>; // optional metadata
  type?: 'ORDER' | 'SYSTEM' | 'PROMO' | 'ACCOUNT' | 'OTHER';
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
};
