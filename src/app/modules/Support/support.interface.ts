import mongoose from 'mongoose';
import { TUserRole } from '../../constant/user.constant';
import { TConversationParticipant } from './support.constant';

export type TConversationType =
  | 'SUPPORT' // Admin <-> Customer (Ticket based)
  | 'VENDOR_CHAT' // Admin <-> Vendor
  | 'DRIVER_CHAT' // Admin <-> Driver/Delivery Partner
  | 'CUSTOMER_CHAT' // Admin <-> Customer (Direct)
  | 'FLEET_MANAGER_CHAT' // Admin <-> Fleet Manager
  | 'FLEET_DRIVER_CHAT' // Fleet Manager <-> Delivery Partner
  | 'ORDER' // Specific to an Order
  | 'DIRECT'; // General/Others

export type TSupportConversation = {
  _id?: mongoose.Types.ObjectId;

  room: string;
  ticketId?: string;

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

  // Optional reference ID (e.g., Order ID)
  referenceId?: string;

  //  Flags
  isActive?: boolean;
  isDeleted?: boolean;

  createdAt?: Date;
  updatedAt?: Date;
};

export type TSupportMessage = {
  _id?: mongoose.Types.ObjectId;

  ticketId?: string;
  room: string;

  senderId: string;
  senderRole: TUserRole;

  message: string;
  attachments?: string[];

  //  Read status per participant (generic)
  readBy: Map<string, boolean>; // { "userId1": true, "userId2": false }

  //  Edit / delete
  isEdited?: boolean;
  editedAt?: Date | null;
  isDeleted?: boolean;

  //  Thread support
  replyTo?: mongoose.Types.ObjectId | null;

  createdAt?: Date;
  updatedAt?: Date;
};
