import { SupportConversation, SupportMessage } from './support.model';
import { TSupportMessage } from './support.interface';
import { AuthUser } from '../../constant/user.constant';
import { findUserByEmailOrId } from '../../utils/findUserByEmailOrId';
import AppError from '../../errors/AppError';
import httpStatus from 'http-status';
import { QueryBuilder } from '../../builder/QueryBuilder';
import { getIO } from '../../lib/socket';

const validateUser = async (user: AuthUser) => {
  const res = await findUserByEmailOrId({ userId: user.id, isDeleted: false });
  if (!res.user) throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  return res.user;
};

const validateConversation = async (room: string) => {
  const conversation = await SupportConversation.findOne({
    room,
    isDeleted: false,
  });
  if (!conversation)
    throw new AppError(httpStatus.NOT_FOUND, 'Support conversation not found');
  return conversation;
};

// Service to open or create a support conversation
const openOrCreateConversation = async (currentUser: AuthUser) => {
  const user = await validateUser(currentUser);
  const room = `support-${user.userId}`;

  const existing = await SupportConversation.findOne({
    room,
    isDeleted: false,
  });
  if (existing) return existing;

  return SupportConversation.create({
    room,
    userId: user.userId,
    userName: user.name.firstName + ' ' + user.name.lastName,
    userRole: user.role,
    assignedAdmin: null,
    status: 'OPEN',
    lastMessage: '',
    lastMessageTime: new Date(),
    resolvedAt: null,
    unreadUserCount: 0,
    unreadAdminCount: 0,
    isDeleted: false,
  });
};

// Service to get all support conversations
const getAllSupportConversations = async (query: Record<string, unknown>) => {
  const rooms = new QueryBuilder(
    SupportConversation.find({ isDeleted: false }),
    query
  )
    .search(['room'])
    .filter()
    .sort()
    .paginate()
    .fields();

  const data = await rooms.modelQuery;
  const meta = await rooms.countTotal();

  return { meta, data };
};

// Service to store a support message
const storeSupportMessage = async (
  payload: TSupportMessage,
  currentUser: AuthUser
) => {
  const sender = await validateUser(currentUser);
  const io = getIO();

  const conversation = await validateConversation(payload.room);

  await SupportConversation.updateOne(
    { room: payload.room },
    {
      $set: { lastMessage: payload.message, lastMessageTime: new Date() },
      $inc:
        sender.role === 'ADMIN' || sender.role === 'SUPER_ADMIN'
          ? { unreadUserCount: 1, unreadAdminCount: 0 }
          : { unreadAdminCount: 1, unreadUserCount: 0 },
    }
  );

  if (
    (sender.role === 'ADMIN' || sender.role === 'SUPER_ADMIN') &&
    !conversation.assignedAdmin
  ) {
    await SupportConversation.updateOne(
      { room: payload.room },
      { assignedAdmin: sender.userId }
    );
    io.to(payload.room).emit('support-assigned-admin', {
      room: payload.room,
      assignedAdmin: sender.userId,
    });
  }

  const newMessage = await SupportMessage.create({
    room: payload.room,
    senderId: sender.userId,
    senderRole: sender.role,
    message: payload.message,
    attachments: payload.attachments ?? [],
    readByAdmin: sender.role === 'ADMIN' || sender.role === 'SUPER_ADMIN',
    readByUser: false,
    isDeleted: false,
    isEdited: false,
    editedAt: null,
    replyTo: payload.replyTo ?? null,
  });

  io.to(payload.room).emit('support-message', newMessage);
  return newMessage;
};

// Service to get messages by room
const getMessagesByRoom = async (
  query: Record<string, unknown>,
  room: string,
  currentUser: AuthUser
) => {
  const sender = await validateUser(currentUser);

  const messageQuery: Record<string, unknown> = { room, isDeleted: false };

  if (sender.role !== 'ADMIN' && sender.role !== 'SUPER_ADMIN') {
    messageQuery.senderId = sender.userId;
  }

  const qb = new QueryBuilder(SupportMessage.find(messageQuery), query)
    .filter()
    .sort()
    .paginate()
    .fields();

  return { meta: await qb.countTotal(), data: await qb.modelQuery };
};

// Service to mark messages as read by admin or user
const markReadByAdminOrUser = async (room: string, currentUser: AuthUser) => {
  const reader = await validateUser(currentUser);
  const io = getIO();

  if (reader.role === 'ADMIN' || reader.role === 'SUPER_ADMIN') {
    await SupportMessage.updateMany(
      { room, readByAdmin: false },
      { readByAdmin: true }
    );
    await SupportConversation.updateOne(
      { room },
      { $set: { unreadAdminCount: 0 } }
    );
  } else {
    await SupportMessage.updateMany(
      { room, readByUser: false },
      { readByUser: true }
    );
    await SupportConversation.updateOne(
      { room },
      { $set: { unreadUserCount: 0 } }
    );
  }

  io.to(room).emit('support-read-update', {
    room,
    readBy: reader.role,
    time: new Date(),
  });
  return { room, readBy: reader.role };
};

export const SupportService = {
  openOrCreateConversation,
  getAllSupportConversations,
  storeSupportMessage,
  getMessagesByRoom,
  markReadByAdminOrUser,
};
