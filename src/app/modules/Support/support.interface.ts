import mongoose from 'mongoose';
import { TUserRole } from '../../constant/user.constant';

/**
 * SUPPORT SYSTEM TYPES
 * --------------------
 * TTicketStatus: Defines the lifecycle of a support session.
 * TUserModel: Essential for 'refPath' to handle different user collections (Customer, Vendor, etc.)
 */
export type TTicketStatus = 'OPEN' | 'IN_PROGRESS' | 'CLOSED';
export type THandlerType = 'AI' | 'AGENT' | 'NONE';

export type TUserModel =
  | 'Admin'
  | 'Customer'
  | 'Vendor'
  | 'FleetManager'
  | 'DeliveryPartner';

export type TSupportTicket = {
  _id?: mongoose.Types.ObjectId;
  ticketId: string; // Unique human-readable ID (e.g., PT-2026-001)
  userObjectId: mongoose.Types.ObjectId;
  userModel: TUserModel; // Points to the specific collection (refPath)
  activeHandler: THandlerType;
  assignedAdminId?: mongoose.Types.ObjectId | null;
  status: TTicketStatus;
  aiMetadata?: {
    lastIntent?: string;
    needsHuman: boolean;
  };
  category: 'ORDER_ISSUE' | 'PAYMENT' | 'IVA_INVOICE' | 'TECHNICAL' | 'GENERAL';
  referenceOrderId?: mongoose.Types.ObjectId; // Order ID reference
  lastMessage?: string;
  lastMessageSender?: TUserRole;
  lastMessageTime?: Date;
  unreadCount: Map<string, number>;
  closedAt?: Date;
  closedBy?: mongoose.Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
};

export type TSupportMessage = {
  _id?: mongoose.Types.ObjectId;
  ticketId: string;
  senderId: string;
  senderRole: TUserRole;
  message: string;
  messageType: 'TEXT' | 'IMAGE' | 'AUDIO' | 'LOCATION' | 'SYSTEM';
  attachments?: string[];
  readBy: Map<string, boolean>;
  createdAt?: Date;
  updatedAt?: Date;
};
