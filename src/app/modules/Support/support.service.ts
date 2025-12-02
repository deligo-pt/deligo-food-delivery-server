import { SupportConversation, SupportMessage } from './support.model';
import { TSupportMessage } from './support.interface';
import { AuthUser } from '../../constant/user.constant';
import { findUserByEmailOrId } from '../../utils/findUserByEmailOrId';
import AppError from '../../errors/AppError';
import httpStatus from 'http-status';
import { QueryBuilder } from '../../builder/QueryBuilder';
import { getIO } from '../../lib/socket';

// Open or create a support conversation service
const openOrCreateConversation = async (currentUser: AuthUser) => {
  const result = await findUserByEmailOrId({
    userId: currentUser.id,
    isDeleted: false,
  });
  const loggedInUser = result.user;
  const room = `support-${loggedInUser?.userId}`;

  const existing = await SupportConversation.findOne({
    room,
    isDeleted: false,
  });

  if (existing) return existing;
  const newConversation = await SupportConversation.create({
    room,
    userId: loggedInUser?.userId,
    userName: loggedInUser?.name,
    userRole: loggedInUser?.role,
    assignedAdmin: null,
    status: 'OPEN',
    lastMessage: '',
  });

  return newConversation;
};

// get all support conversations service
const getAllSupportConversations = async (query: Record<string, unknown>) => {
  const result = new QueryBuilder(SupportConversation.find(), query)
    .fields()
    .paginate()
    .sort()
    .filter()
    .search(['room']);

  const data = await result.modelQuery;
  const meta = await result.countTotal();

  return { meta, data };
};

// Store support message service
const storeSupportMessage = async (
  payload: TSupportMessage,
  currentUser: AuthUser
) => {
  const io = getIO();
  await findUserByEmailOrId({ userId: currentUser.id, isDeleted: false });

  if (payload.room) {
    const conversation = await SupportConversation.findOne({
      room: payload.room,
      isDeleted: false,
    });

    if (!conversation) {
      throw new AppError(
        httpStatus.NOT_FOUND,
        'Support conversation not found. Please give a valid room.'
      );
    }

    if (conversation) {
      conversation.lastMessage = payload.message;
      conversation.lastMessageTime = new Date();
      await conversation.save();
    }
  }

  payload.senderId = currentUser.id;
  payload.senderRole = currentUser.role;

  const newMessage = await SupportMessage.create(payload);

  io.to(payload.room).emit('support-message', {
    message: payload.message,
    senderId: payload.senderId,
    senderRole: payload.senderRole,
    attachments: payload.attachments || [],
    createdAt: newMessage.createdAt,
  });

  return newMessage;
};

// Get messages by room service
const getMessagesByRoom = async (
  query: Record<string, unknown>,
  room: string,
  currentUser: AuthUser
) => {
  await findUserByEmailOrId({ userId: currentUser.id, isDeleted: false });
  if (currentUser.role !== 'ADMIN' && currentUser.role !== 'SUPER_ADMIN') {
    query['senderId'] = currentUser.id;
  }
  const result = new QueryBuilder(SupportMessage.find({ room }), query)
    .filter()
    .sort()
    .paginate()
    .fields();

  const data = await result.modelQuery;
  const meta = await result.countTotal();

  return { data, meta };
};

// Mark messages as read by admin or user service
const markReadByAdminOrUser = async (room: string, currentUser: AuthUser) => {
  await findUserByEmailOrId({ userId: currentUser.id, isDeleted: false });
  if (currentUser.role === 'ADMIN' || currentUser.role === 'SUPER_ADMIN') {
    await SupportMessage.updateMany(
      { room, readByAdmin: false },
      { readByAdmin: true }
    );
    await SupportConversation.updateMany(
      { room },
      { assignedAdmin: currentUser.id }
    );
  } else {
    await SupportMessage.updateMany(
      { room, readByUser: false },
      { readByUser: true }
    );
  }
  return { room, readBy: currentUser.role };
};

export const SupportService = {
  openOrCreateConversation,
  getAllSupportConversations,
  storeSupportMessage,
  getMessagesByRoom,
  markReadByAdminOrUser,
};
