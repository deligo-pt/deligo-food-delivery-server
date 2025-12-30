import { Schema, model } from 'mongoose';
import { TSupportConversation, TSupportMessage } from './support.interface';
import { USER_ROLE } from '../../constant/user.constant';

// ---------------------------------------------------------------------------
//  Support Conversation Schema (GENERIC)
// ---------------------------------------------------------------------------

const participantSchema = new Schema(
  {
    userId: { type: String, required: true },
    role: {
      type: String,
      enum: Object.values(USER_ROLE),
      required: true,
    },
    name: { type: String },
  },
  { _id: false }
);

const supportConversationSchema = new Schema<TSupportConversation>(
  {
    room: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    // Generic participants
    participants: {
      type: [participantSchema],
      required: true,
    },

    // Conversation lock owner
    handledBy: {
      type: String,
      default: null,
      index: true,
    },

    // Lifecycle
    status: {
      type: String,
      enum: ['OPEN', 'IN_PROGRESS', 'CLOSED'],
      default: 'OPEN',
      index: true,
    },

    // Meta
    lastMessage: { type: String, default: '' },
    lastMessageTime: { type: Date, default: null },

    // Unread count per participant
    unreadCount: {
      type: Map,
      of: Number,
      default: {},
    },

    type: {
      type: String,
      enum: ['SUPPORT', 'ORDER', 'DIRECT'],
      default: 'SUPPORT',
    },

    // Flags
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

// Sorting for inbox
supportConversationSchema.index({ lastMessageTime: -1 });

// ---------------------------------------------------------------------------
//  Support Message Schema (GENERIC)
// ---------------------------------------------------------------------------

const supportMessageSchema = new Schema<TSupportMessage>(
  {
    room: { type: String, required: true, index: true },

    // Sender
    senderId: { type: String, required: true, index: true },
    senderRole: {
      type: String,
      enum: Object.values(USER_ROLE),
      required: true,
    },

    // Content
    message: { type: String, required: true },
    attachments: { type: [String], default: [] },

    // Read status per participant
    readBy: {
      type: Map,
      of: Boolean,
      default: {},
      index: true,
    },

    // Edit / delete
    isEdited: { type: Boolean, default: false },
    editedAt: { type: Date, default: null },
    isDeleted: { type: Boolean, default: false, index: true },

    // Thread / reply
    replyTo: {
      type: Schema.Types.ObjectId,
      ref: 'SupportMessage',
      default: null,
    },
  },
  { timestamps: true }
);

// Message order
supportMessageSchema.index({ createdAt: -1 });

// Auto set editedAt
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
