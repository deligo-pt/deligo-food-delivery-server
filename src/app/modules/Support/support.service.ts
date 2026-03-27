/* eslint-disable @typescript-eslint/no-explicit-any */

import httpStatus from 'http-status';
import { generateTicketId } from '../../utils/generateTicketId';
import { TUserModel } from './support.interface';
import { SupportMessage, SupportTicket } from './support.model';
import AppError from '../../errors/AppError';
import { QueryBuilder } from '../../builder/QueryBuilder';
import { AuthUser, ROLE_COLLECTION_MAP } from '../../constant/user.constant';

/**
 * Checks for an existing active ticket.
 * If the last session was CLOSED, it creates a new Ticket ID and Room.
 */
const getOrCreateActiveTicket = async (
  userObjectId: string,
  userModel: TUserModel,
  userId: string,
) => {
  let ticket = await SupportTicket.findOne({
    userId: userObjectId,
    userModel,
    status: { $ne: 'CLOSED' },
  });

  if (!ticket) {
    const ticketId = await generateTicketId();
    const room = `ROOM_${userId}_${Date.now()}`;

    ticket = await SupportTicket.create({
      ticketId,
      room,
      userId: userObjectId,
      userModel,
      status: 'OPEN',
      activeHandler: 'AI', // Default handler is AI
      unreadCount: new Map(),
    });
  }
  return ticket;
};

const createMessage = async (payload: any, currentUser: AuthUser) => {
  const userModel = ROLE_COLLECTION_MAP[currentUser.role];

  // 2. Determine Sender Role
  const senderRole =
    currentUser.role === 'ADMIN' || currentUser.role === 'SUPER_ADMIN'
      ? 'AGENT'
      : 'CUSTOMER';

  // 3. Get or Create active ticket
  const ticket = await getOrCreateActiveTicket(
    currentUser._id.toString(), // Using DB _id from decoded token
    userModel as TUserModel,
    currentUser.userId,
  );

  // 4. Create the message
  const newMessage = await SupportMessage.create({
    ticketId: ticket.ticketId,
    room: ticket.room,
    senderId: currentUser.userId, // Custom ID like C-VXXS...
    senderRole: senderRole,
    message: payload.message,
    messageType: payload.messageType || 'TEXT',
    attachments: payload.attachments || [],
    readBy: new Map([[currentUser.userId, true]]),
  });

  // 5. Update Ticket Metadata
  ticket.lastMessage = payload.message;
  ticket.lastMessageSender = senderRole;
  ticket.lastMessageTime = new Date();

  // If an Agent replies, update ticket status
  if (senderRole === 'AGENT') {
    ticket.status = 'IN_PROGRESS';
    ticket.activeHandler = 'AGENT';
    ticket.assignedAdminId = currentUser._id as any;
  }

  await ticket.save();
  return newMessage;
};

const closeTicket = async (room: string, adminId: string) => {
  const ticket = await SupportTicket.findOne({
    room,
    status: { $ne: 'CLOSED' },
  });
  if (!ticket)
    throw new AppError(httpStatus.NOT_FOUND, 'Active ticket not found');

  ticket.status = 'CLOSED';
  ticket.closedAt = new Date();
  ticket.closedBy = adminId as any;
  ticket.activeHandler = 'NONE';
  await ticket.save();

  // Send automated closing message (Portuguese)
  await SupportMessage.create({
    ticketId: ticket.ticketId,
    room: ticket.room,
    senderId: adminId,
    senderRole: 'AGENT',
    message:
      'O suporte foi encerrado. Envie uma nova mensagem para iniciar um novo ticket.',
    messageType: 'SYSTEM',
  });

  return { success: true };
};

const getAllTickets = async (query: Record<string, unknown>) => {
  const qb = new QueryBuilder(SupportTicket.find().populate('userId'), query)
    .search(['ticketId', 'lastMessage'])
    .filter()
    .sort()
    .paginate()
    .fields();
  return { meta: await qb.countTotal(), data: await qb.modelQuery };
};

const getMessagesByRoom = async (
  room: string,
  query: Record<string, unknown>,
) => {
  const qb = new QueryBuilder(SupportMessage.find({ room }), query)
    .sort()
    .paginate()
    .fields();
  return { meta: await qb.countTotal(), data: await qb.modelQuery };
};

const markReadByAdminOrUser = async (room: string, userId: string) => {
  await SupportMessage.updateMany(
    { room, [`readBy.${userId}`]: { $ne: true } },
    { $set: { [`readBy.${userId}`]: true } },
  );
  const ticket = await SupportTicket.findOne({ room });
  if (ticket?.unreadCount) {
    ticket.unreadCount.set(userId, 0);
    await ticket.save();
  }
  return true;
};

export const SupportService = {
  createMessage,
  closeTicket,
  getAllTickets,
  getMessagesByRoom,
  markReadByAdminOrUser,
};
