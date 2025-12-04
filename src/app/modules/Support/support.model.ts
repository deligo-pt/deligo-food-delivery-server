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

    lastMessage: { type: String, default: '' },
    lastMessageTime: { type: Date, default: Date.now },

    unreadUserCount: { type: Number, default: 0, min: 0 },
    unreadAdminCount: { type: Number, default: 0, min: 0 },

    isDeleted: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

// Index to sort conversations faster
supportConversationSchema.index({ lastMessageTime: -1 });

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

    readByAdmin: { type: Boolean, default: false, index: true },
    readByUser: { type: Boolean, default: false, index: true },

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

// Index to fetch latest chats faster
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
