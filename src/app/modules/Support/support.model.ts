import { Schema, model } from 'mongoose';
import { TSupportConversation, TSupportMessage } from './support.interface';

const supportConversationSchema = new Schema<TSupportConversation>(
  {
    room: { type: String, required: true, unique: true, index: true },

    // Sender Details
    userId: { type: String, required: true, index: true },
    userName: { type: String, required: true },
    userRole: {
      type: String,
      enum: [
        'VENDOR',
        'SUB_VENDOR',
        'CUSTOMER',
        'FLEET_MANAGER',
        'DELIVERY_PARTNER',
        'ADMIN',
        'SUPER_ADMIN',
      ],
      required: true,
    },

    // Receiver Details
    receiverId: { type: String, default: null, index: true },
    receiverName: { type: String },
    receiverRole: {
      type: String,
      enum: [
        'VENDOR',
        'SUB_VENDOR',
        'CUSTOMER',
        'FLEET_MANAGER',
        'DELIVERY_PARTNER',
        'ADMIN',
        'SUPER_ADMIN',
      ],
      default: 'ADMIN',
    },

    lastMessage: { type: String, default: '' },
    lastMessageTime: { type: Date, default: Date.now },

    unreadUserCount: { type: Number, default: 0, min: 0 },
    unreadReceiverCount: { type: Number, default: 0, min: 0 },

    type: {
      type: String,
      enum: ['SUPPORT', 'ORDER', 'DIRECT'],
      default: 'SUPPORT',
    },

    isDeleted: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

supportConversationSchema.index({ lastMessageTime: -1 });

const supportMessageSchema = new Schema<TSupportMessage>(
  {
    room: { type: String, required: true, index: true },
    senderId: { type: String, required: true, index: true },
    senderRole: {
      type: String,
      enum: [
        'VENDOR',
        'SUB_VENDOR',
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

    readByReceiver: { type: Boolean, default: false, index: true },
    readBySender: { type: Boolean, default: true },

    isEdited: { type: Boolean, default: false },
    editedAt: { type: Date, default: null },
    isDeleted: { type: Boolean, default: false, index: true },

    replyTo: {
      type: Schema.Types.ObjectId,
      ref: 'SupportMessage',
      default: null,
    },
  },
  { timestamps: true }
);

supportMessageSchema.index({ createdAt: -1 });

supportMessageSchema.pre('save', function (next) {
  if (this.isEdited && !this.editedAt) {
    this.editedAt = new Date();
  }
  next();
});

export const SupportConversation = model<TSupportConversation>(
  'SupportConversation',
  supportConversationSchema
);
export const SupportMessage = model<TSupportMessage>(
  'SupportMessage',
  supportMessageSchema
);
