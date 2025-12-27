import mongoose from 'mongoose';
import { TUserRole } from '../../constant/user.constant';

export type TConversationType = 'SUPPORT' | 'ORDER' | 'DIRECT';

export type TSupportConversation = {
  _id?: mongoose.Types.ObjectId;
  room: string;

  userId: string;
  userName: string;
  userRole: TUserRole;

  receiverId: string | null;
  receiverName?: string;
  receiverRole: TUserRole;

  lastMessage?: string;
  lastMessageTime?: Date;

  unreadCount: {
    user: number;
    receiver: number;
  };

  type: TConversationType;

  isActive?: boolean;
  isDeleted?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
};

export type TSupportMessage = {
  _id?: mongoose.Types.ObjectId;

  room: string;

  senderId: string;
  senderRole: TUserRole;

  message: string;
  attachments?: string[];

  readBy: {
    sender: boolean;
    receiver: boolean;
  };

  isEdited?: boolean;
  editedAt?: Date | null;
  isDeleted?: boolean;

  replyTo?: mongoose.Types.ObjectId | null;

  createdAt?: Date;
  updatedAt?: Date;
};
