import { Types } from 'mongoose';

export type TSupportConversation = {
  _id?: Types.ObjectId;
  room: string;
  userId: string;
  userName: string;
  userRole:
    | 'VENDOR'
    | 'CUSTOMER'
    | 'FLEET_MANAGER'
    | 'DELIVERY_PARTNER'
    | 'ADMIN'
    | 'SUPER_ADMIN';

  assignedAdmin?: string | null;
  lastMessage?: string;
  lastMessageTime?: Date;
  isDeleted?: boolean;
  unreadUserCount?: number;
  unreadAdminCount?: number;

  createdAt?: Date;
  updatedAt?: Date;
};

export type TSupportMessage = {
  _id?: Types.ObjectId;
  room: string;
  senderId: string;
  senderRole:
    | 'VENDOR'
    | 'CUSTOMER'
    | 'FLEET_MANAGER'
    | 'DELIVERY_PARTNER'
    | 'ADMIN'
    | 'SUPER_ADMIN';

  message: string;
  attachments?: string[];
  readByAdmin?: boolean;
  readByUser?: boolean;
  isEdited?: boolean;
  editedAt?: Date | null;
  isDeleted?: boolean;
  replyTo?: Types.ObjectId | null;

  createdAt?: Date;
  updatedAt?: Date;
};
