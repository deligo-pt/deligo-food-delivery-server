// src/app/modules/support/support.model.ts
import { Schema, model } from 'mongoose';
import { TSupportConversation, TSupportMessage } from './support.interface';

const supportConversationSchema = new Schema<TSupportConversation>(
  {
    room: { type: String, required: true, unique: true },
    userId: { type: String, required: true },
    userName: { type: String, required: true },
    userRole: {
      type: String,
      enum: [
        'VENDOR',
        'CUSTOMER',
        'FLEET_MANAGER',
        'DELIVERY_PARTNER',
        'ADMIN',
        'SUPER_ADMIN',
      ],
      required: true,
    },
    assignedAdmin: { type: String, default: null },
    status: { type: String, enum: ['OPEN', 'CLOSED'], default: 'OPEN' },
    lastMessage: { type: String, default: '' },
    lastMessageTime: { type: Date, default: Date.now },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const supportMessageSchema = new Schema<TSupportMessage>(
  {
    room: { type: String, required: true, index: true },
    senderId: { type: String, required: true },
    senderRole: {
      type: String,
      enum: [
        'VENDOR',
        'CUSTOMER',
        'FLEET_MANAGER',
        'DELIVERY_PARTNER',
        'ADMIN',
        'SUPER_ADMIN',
      ],
      required: true,
    },
    message: { type: String, required: true },
    attachments: { type: [String], default: [] },
    readByAdmin: { type: Boolean, default: false },
    readByUser: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const SupportConversation = model<TSupportConversation>(
  'SupportConversation',
  supportConversationSchema
);

export const SupportMessage = model<TSupportMessage>(
  'SupportMessage',
  supportMessageSchema
);
