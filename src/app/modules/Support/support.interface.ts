import mongoose from 'mongoose';
import { TUserRole } from '../../constant/user.constant';
import { TConversationParticipant } from './support.constant';

export type TConversationType = 'SUPPORT' | 'ORDER' | 'DIRECT';

export type TSupportConversation = {
  _id?: mongoose.Types.ObjectId;

  room: string;

  //  Generic participants (NOT user/receiver)
  participants: TConversationParticipant[];

  // Conversation lock owner (admin / vendor / customer)
  handledBy: string | null;

  // Conversation lifecycle
  status: 'OPEN' | 'IN_PROGRESS' | 'CLOSED';

  //  Last message meta
  lastMessage?: string;
  lastMessageTime?: Date;

  //  Unread count per participant (generic)
  unreadCount: Map<string, number>; // { "userId1": 0, "userId2": 3 }

  //  Conversation category
  type: TConversationType;

  //  Flags
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

  //  Read status per participant (generic)
  readBy: Record<string, boolean>; // { "userId1": true, "userId2": false }

  //  Edit / delete
  isEdited?: boolean;
  editedAt?: Date | null;
  isDeleted?: boolean;

  //  Thread support
  replyTo?: mongoose.Types.ObjectId | null;

  createdAt?: Date;
  updatedAt?: Date;
};
