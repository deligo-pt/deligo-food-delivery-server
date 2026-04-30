import { Schema, model } from 'mongoose';
import { TSupportMessage, TSupportTicket } from './support.interface';
import { USER_ROLE } from '../../constant/user.constant';

// TICKET SCHEMA: Handles session metadata
const supportTicketSchema = new Schema<TSupportTicket>(
  {
    ticketId: { type: String, unique: true, required: true, index: true },
    userObjectId: {
      type: Schema.Types.ObjectId,
      required: true,
      refPath: 'userModel', // Dynamic reference to multiple collections
    },
    userModel: {
      type: String,
      enum: ['Admin', 'Customer', 'Vendor', 'FleetManager', 'DeliveryPartner'],
      required: true,
    },
    activeHandler: {
      type: String,
      enum: ['AI', 'AGENT', 'NONE'],
      default: 'AI',
    },
    assignedAdminId: {
      type: Schema.Types.ObjectId,
      ref: 'Admin',
      default: null,
    },
    status: {
      type: String,
      enum: ['OPEN', 'IN_PROGRESS', 'CLOSED'],
      default: 'OPEN',
    },
    category: {
      type: String,
      enum: ['ORDER_ISSUE', 'PAYMENT', 'IVA_INVOICE', 'TECHNICAL', 'GENERAL'],
      default: 'GENERAL',
    },
    referenceOrderId: { type: Schema.Types.ObjectId, ref: 'Order' },
    lastMessage: { type: String },
    lastMessageSender: { type: String, enum: Object.values(USER_ROLE) },
    lastMessageTime: { type: Date, default: Date.now },
    unreadCount: { type: Map, of: Number, default: {} },
    closedAt: { type: Date },
    closedBy: { type: Schema.Types.ObjectId, ref: 'Admin' },
  },
  { timestamps: true },
);

// MESSAGE SCHEMA: Stores actual conversation logs
const supportMessageSchema = new Schema<TSupportMessage>(
  {
    ticketId: { type: String, required: true, index: true },
    senderId: { type: String, required: true },
    senderRole: {
      type: String,
      enum: Object.values(USER_ROLE),
      required: true,
    },
    message: { type: String, required: true },
    messageType: {
      type: String,
      enum: ['TEXT', 'IMAGE', 'AUDIO', 'LOCATION', 'SYSTEM'],
      default: 'TEXT',
    },
    attachments: [{ type: String }],
    readBy: { type: Map, of: Boolean, default: {} },
  },
  { timestamps: true },
);

const counterSchema = new Schema({
  id: { type: String, required: true, unique: true },
  seq: { type: Number, default: 0 },
});

export const Counter = model('Counter', counterSchema);

export const SupportTicket = model<TSupportTicket>(
  'SupportTicket',
  supportTicketSchema,
);
export const SupportMessage = model<TSupportMessage>(
  'SupportMessage',
  supportMessageSchema,
);
