/* eslint-disable @typescript-eslint/no-explicit-any */
import httpStatus from 'http-status';
import AppError from '../../errors/AppError';
import { AuthUser, TUserRole } from '../../constant/user.constant';
import { findUserByEmailOrId } from '../../utils/findUserByEmailOrId';
import { SupportConversation, SupportMessage } from './support.model';
import { QueryBuilder } from '../../builder/QueryBuilder';
import { TConversationParticipant } from './support.constant';
import { generateTicketId } from '../../utils/generateTicketId';
import { TConversationType } from './support.interface';

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------

const validateUser = async (user: AuthUser) => {
  const res = await findUserByEmailOrId({
    userId: user.id,
    isDeleted: false,
  });

  if (!res.user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }

  return res.user;
};

const ensureParticipant = (conversation: any, userId: string) => {
  const isParticipant = conversation.participants.some(
    (p: TConversationParticipant) => p.userId === userId
  );

  if (!isParticipant) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'You are not a participant of this conversation'
    );
  }
};

const ensureConversationLock = async (
  conversation: any,
  userId: string,
  role: string
) => {
  if (conversation.status === 'CLOSED') {
    throw new AppError(httpStatus.BAD_REQUEST, 'Conversation is closed');
  }

  if (conversation.handledBy && conversation.handledBy !== userId) {
    if (role === 'ADMIN' || role === 'SUPER_ADMIN') {
      throw new AppError(
        httpStatus.FORBIDDEN,
        'This conversation is locked by another admin'
      );
    }
  }

  if ((!conversation.handledBy && role === 'ADMIN') || role === 'SUPER_ADMIN') {
    conversation.handledBy = userId;
    conversation.status = 'IN_PROGRESS';
    await conversation.save();
  }
};

// ------------------------------------------------------------------
// Open or Create Conversation (GENERIC)
// ------------------------------------------------------------------

const openOrCreateConversation = async (
  currentUser: AuthUser,
  payload?: {
    type?: TConversationType;
    referenceId?: string;
    targetUser?: {
      userId: string;
      role: TUserRole;
      name?: string;
    };
  }
) => {
  const user = await validateUser(currentUser);

  const type = payload?.type ?? 'SUPPORT';

  // deterministic room
  let room: string;

  if (type === 'SUPPORT') {
    room = `SUPPORT_${user.id}`;
  } else if (payload?.targetUser) {
    const ids = [user.id, payload.targetUser.userId].sort();
    room = `${type}_${ids[0]}_${ids[1]}`;
    if (type === 'ORDER' && payload.referenceId) {
      room = `ORDER_${payload.referenceId}_${ids[0]}_${ids[1]}`;
    }
  } else {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Target user is required for DIRECT or ORDER conversations'
    );
  }

  const existing = await SupportConversation.findOne({
    room,
    isDeleted: false,
  });

  if (existing) {
    if (type === 'SUPPORT' && existing.status === 'CLOSED') {
      existing.status = 'OPEN';
      existing.handledBy = null;
      existing.ticketId = await generateTicketId();
      await existing.save();
    }
    return existing;
  }

  const ticketId = type === 'SUPPORT' ? await generateTicketId() : undefined;

  const participants: TConversationParticipant[] = [
    {
      userId: user.userId,
      role: user.role,
      name: `${user.name.firstName} ${user.name.lastName}`,
    },
  ];

  if (payload?.targetUser) {
    participants.push(payload.targetUser);
  }

  const unreadCount = new Map<string, number>();
  participants.forEach((p) => unreadCount.set(p.userId, 0));

  return SupportConversation.create({
    room,
    ticketId,
    participants,
    type,
    referenceId: payload?.referenceId || undefined,
    status: 'OPEN',
    unreadCount,
    isActive: true,
  });
};

// ------------------------------------------------------------------
// Get Conversations (GENERIC)
// ------------------------------------------------------------------

const getAllSupportConversations = async (
  query: Record<string, unknown>,
  currentUser: AuthUser
) => {
  await validateUser(currentUser);

  const baseFilter: Record<string, any> = { isDeleted: false };

  if (currentUser.role !== 'ADMIN' && currentUser.role !== 'SUPER_ADMIN') {
    baseFilter['participants.userId'] = currentUser.id;
  }

  if (query.role) {
    baseFilter['participants.role'] = query.role;
    delete query.role;
  }

  const qb = new QueryBuilder(SupportConversation.find(baseFilter), query)
    .sort()
    .paginate()
    .fields()
    .search(['room', 'ticketId']);

  const data = await qb.modelQuery;
  const meta = await qb.countTotal();

  return { meta, data };
};

// ------------------------------------------------------------------
// Get Conversation (GENERIC)
// ------------------------------------------------------------------

const getSingleSupportConversationController = async (
  room: string,
  currentUser: AuthUser
) => {
  await validateUser(currentUser);

  const conversation = await SupportConversation.findOne({
    room,
    isDeleted: false,
  });

  if (!conversation) {
    throw new AppError(httpStatus.NOT_FOUND, 'Conversation not found');
  }
  if (currentUser.role !== 'ADMIN' && currentUser.role !== 'SUPER_ADMIN') {
    ensureParticipant(conversation, currentUser.id);
  }

  return conversation;
};

// ------------------------------------------------------------------
// Create Message (CALLED FROM SOCKET ONLY)
// ------------------------------------------------------------------

const createMessage = async ({
  room,
  senderId,
  senderRole,
  message,
  attachments = [],
  replyTo = null,
}: {
  room: string;
  senderId: string;
  senderRole: string;
  message: string;
  attachments?: string[];
  replyTo?: any;
}) => {
  const conversation = await SupportConversation.findOne({
    room,
    isDeleted: false,
  });

  if (!conversation) {
    throw new AppError(httpStatus.NOT_FOUND, 'Conversation not found');
  }

  if (senderRole !== 'ADMIN' && senderRole !== 'SUPER_ADMIN') {
    ensureParticipant(conversation, senderId);
  }
  if (conversation.type === 'SUPPORT') {
    await ensureConversationLock(conversation, senderId, senderRole);
  }

  // --------------------------------------------------
  //  Read map (DO NOT replace map)
  // --------------------------------------------------
  const readBy = new Map<string, boolean>();
  conversation.participants.forEach((p) => {
    readBy.set(p.userId, p.userId === senderId);
  });

  const msg = await SupportMessage.create({
    ticketId: conversation?.ticketId || null,
    room,
    senderId,
    senderRole,
    message,
    attachments,
    readBy,
    replyTo,
  });

  // --------------------------------------------------
  //  Update unreadCount SAFELY (Map-safe)
  // --------------------------------------------------
  conversation.participants.forEach((p: TConversationParticipant) => {
    if (p.userId !== senderId) {
      const current = conversation.unreadCount.get(p.userId) || 0;
      conversation.unreadCount.set(p.userId, current + 1);
    }
  });

  // sender always has 0 unread
  conversation.unreadCount.set(senderId, 0);

  // --------------------------------------------------
  //  Update meta
  // --------------------------------------------------
  conversation.lastMessage = message;
  conversation.lastMessageTime = new Date();

  if (conversation.status === 'OPEN') {
    conversation.status = 'IN_PROGRESS';
  }

  await conversation.save();

  return msg;
};

// ------------------------------------------------------------------
// Get Messages by Room
// ------------------------------------------------------------------

const getMessagesByRoom = async (
  query: Record<string, unknown>,
  room: string,
  currentUser: AuthUser
) => {
  await validateUser(currentUser);

  const conversation = await SupportConversation.findOne({
    room,
    isDeleted: false,
  });

  if (!conversation) {
    throw new AppError(httpStatus.NOT_FOUND, 'Conversation not found');
  }

  if (currentUser.role !== 'ADMIN' && currentUser.role !== 'SUPER_ADMIN') {
    ensureParticipant(conversation, currentUser.id);
  }

  const qb = new QueryBuilder(
    SupportMessage.find({ room, isDeleted: false }),
    query
  )
    .sort()
    .paginate()
    .fields();

  return {
    meta: await qb.countTotal(),
    data: await qb.modelQuery,
  };
};

// ------------------------------------------------------------------
// Mark Messages as Read (GENERIC)
// ------------------------------------------------------------------

const markReadByAdminOrUser = async (room: string, currentUser: AuthUser) => {
  await validateUser(currentUser);

  const conversation = await SupportConversation.findOne({
    room,
    isDeleted: false,
  });

  if (!conversation) {
    throw new AppError(httpStatus.NOT_FOUND, 'Conversation not found');
  }

  ensureParticipant(conversation, currentUser.id);

  await SupportMessage.updateMany(
    { room, [`readBy.${currentUser.id}`]: false },
    { $set: { [`readBy.${currentUser.id}`]: true } }
  );

  conversation.unreadCount.set(currentUser.id, 0);
  await conversation.save();

  return true;
};

// ------------------------------------------------------------------
// Close Conversation (GENERIC)
// ------------------------------------------------------------------

const closeConversation = async (room: string, currentUser: AuthUser) => {
  await validateUser(currentUser);

  const conversation = await SupportConversation.findOne({
    room,
    isDeleted: false,
  });

  if (!conversation) {
    throw new AppError(httpStatus.NOT_FOUND, 'Conversation not found');
  }

  if (conversation.handledBy !== currentUser.id) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'Only handler can close conversation'
    );
  }

  conversation.status = 'CLOSED';
  conversation.handledBy = null;
  await conversation.save();

  return true;
};

export const SupportService = {
  openOrCreateConversation,
  getAllSupportConversations,
  getSingleSupportConversationController,
  createMessage, // socket only
  getMessagesByRoom,
  markReadByAdminOrUser,
  closeConversation,
};
