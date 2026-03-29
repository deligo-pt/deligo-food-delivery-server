/* eslint-disable @typescript-eslint/no-explicit-any */

import httpStatus from 'http-status';
import { generateTicketId } from '../../utils/generateTicketId';
import { TUserModel } from './support.interface';
import { SupportMessage, SupportTicket } from './support.model';
import AppError from '../../errors/AppError';
import { QueryBuilder } from '../../builder/QueryBuilder';
import { AuthUser, ROLE_COLLECTION_MAP } from '../../constant/user.constant';
import { Order } from '../Order/order.model';

/**
 * Checks for an existing active ticket.
 * If the last session was CLOSED, it creates a new Ticket ID .
 */
const getOrCreateActiveTicket = async (
  userObjectId: string,
  userModel: TUserModel,
  category: string = 'GENERAL',
  referenceOrderId?: string,
  isAgent: boolean = false,
) => {
  let ticket = await SupportTicket.findOne({
    userId: userObjectId,
    userModel,
    status: { $ne: 'CLOSED' },
  });

  if (!ticket) {
    if (isAgent) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'No active ticket found for this user. Agents cannot create new tickets.',
      );
    }

    const ticketId = await generateTicketId();

    ticket = await SupportTicket.create({
      ticketId,
      userId: userObjectId,
      userModel,
      category,
      referenceOrderId,
      status: 'OPEN',
      activeHandler: 'AI',
      unreadCount: new Map(),
    });
  } else {
    if (category !== 'GENERAL' && ticket.category === 'GENERAL') {
      ticket.category = category as any;
    }

    if (referenceOrderId && !ticket.referenceOrderId) {
      ticket.referenceOrderId = referenceOrderId as any;
    }

    if (ticket.isModified()) {
      await ticket.save();
    }
  }

  return ticket;
};

const createMessage = async (payload: any, currentUser: AuthUser) => {
  const isAgent =
    currentUser.role === 'ADMIN' || currentUser.role === 'SUPER_ADMIN';

  const senderRole = currentUser.role;
  const targetUserObjectId = isAgent
    ? payload.targetUserObjectId
    : currentUser._id.toString();
  const targetUserCustomId = isAgent
    ? payload.targetUserId
    : currentUser.userId;
  const targetUserModel = isAgent
    ? payload.targetUserModel
    : ROLE_COLLECTION_MAP[currentUser.role];

  if (payload.referenceOrderId && !isAgent) {
    const order = await Order.findById(payload.referenceOrderId);
    if (!order) {
      throw new AppError(httpStatus.NOT_FOUND, 'Order not found');
    }
    if (
      order.customerId.toString() !== currentUser._id.toString() &&
      currentUser.role === 'CUSTOMER'
    ) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        'You are not authorized to create a support ticket for this order',
      );
    }

    if (
      order.vendorId.toString() !== currentUser._id.toString() &&
      (currentUser.role === 'VENDOR' || currentUser.role === 'SUB_VENDOR')
    ) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        'You are not authorized to create a support ticket for this order',
      );
    }

    if (
      currentUser?.role === 'DELIVERY_PARTNER' &&
      order?.deliveryPartnerId?.toString() !== currentUser._id.toString()
    ) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        'You are not authorized to create a support ticket for this order',
      );
    }
  }

  // 3. Get or Create active ticket
  const ticket = await getOrCreateActiveTicket(
    targetUserObjectId,
    targetUserModel as TUserModel,
    payload.category,
    payload.referenceOrderId,
    isAgent,
  );

  // 4. Create the message
  const newMessage = await SupportMessage.create({
    ticketId: ticket.ticketId,
    senderId: currentUser.userId, // Custom ID like C-VXXS...
    senderRole: currentUser.role,
    message: payload.message,
    messageType: payload.messageType || 'TEXT',
    attachments: payload.attachments || [],
    readBy: new Map([[currentUser.userId, true]]),
  });

  let recipientId: string;

  if (isAgent) {
    recipientId = targetUserCustomId;

    if (!ticket.assignedAdminId) {
      ticket.assignedAdminId = currentUser._id as any;
      ticket.status = 'IN_PROGRESS';
      ticket.activeHandler = 'AGENT';

      if (ticket.unreadCount.has('ADMIN_GENERAL')) {
        const generalCount = ticket.unreadCount.get('ADMIN_GENERAL') || 0;
        ticket.unreadCount.set(currentUser.userId, generalCount);
        ticket.unreadCount.delete('ADMIN_GENERAL');
      }
    }
  } else {
    recipientId = 'ADMIN_GENERAL';
  }

  const currentUnread = ticket.unreadCount.get(recipientId) || 0;
  ticket.unreadCount.set(recipientId, currentUnread + 1);
  ticket.markModified('unreadCount');

  // 5. Update Ticket Metadata
  ticket.lastMessage = payload.message;
  ticket.lastMessageSender = senderRole;
  ticket.lastMessageTime = new Date();

  await ticket.save();
  return newMessage;
};

const getAllTickets = async (
  query: Record<string, unknown>,
  currentUser: AuthUser,
) => {
  const isAgent =
    currentUser.role === 'ADMIN' || currentUser.role === 'SUPER_ADMIN';

  let findQuery = SupportTicket.find();

  if (!isAgent) {
    findQuery = findQuery.where({ userId: currentUser._id });
  }
  const qb = new QueryBuilder(
    findQuery
      .populate('userId', 'userId name email')
      .populate('referenceOrderId', 'orderId status ')
      .populate('assignedAdminId', 'userId name email'),
    query,
  )
    .search(['ticketId', 'lastMessage'])
    .filter()
    .sort()
    .paginate()
    .fields();
  return { meta: await qb.countTotal(), data: await qb.modelQuery };
};

const getMessagesByTicketId = async (
  ticketId: string,
  query: Record<string, unknown>,
) => {
  const qb = new QueryBuilder(SupportMessage.find({ ticketId }), query)
    .sort()
    .paginate()
    .fields();
  return { meta: await qb.countTotal(), data: await qb.modelQuery };
};

const markReadByAdminOrUser = async (
  ticketId: string,
  currentUser: AuthUser,
) => {
  const customUserId = currentUser.userId;
  await SupportMessage.updateMany(
    { ticketId: ticketId, [`readBy.${customUserId}`]: { $ne: true } },
    { $set: { [`readBy.${customUserId}`]: true } },
  );
  const ticket = await SupportTicket.findOne({ ticketId: ticketId });
  if (!ticket) {
    throw new AppError(httpStatus.NOT_FOUND, 'Ticket not found');
  }
  if (ticket?.unreadCount) {
    ticket.unreadCount.set(customUserId, 0);
    const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(currentUser.role);
    if (isAdmin) {
      ticket.unreadCount.set('ADMIN_GENERAL', 0);
    }
    ticket.markModified('unreadCount');
    await ticket.save();
  }
  return {
    message: 'Messages marked as read',
  };
};

const closeTicket = async (ticketId: string, currentUser: AuthUser) => {
  const ticket = await SupportTicket.findOne({
    ticketId: ticketId,
    status: { $ne: 'CLOSED' },
  });
  if (!ticket)
    throw new AppError(httpStatus.NOT_FOUND, 'Active ticket not found');

  const adminId = currentUser._id;

  ticket.status = 'CLOSED';
  ticket.closedAt = new Date();
  ticket.closedBy = adminId as any;
  ticket.activeHandler = 'NONE';
  await ticket.save();

  // Send automated closing message (Portuguese)
  await SupportMessage.create({
    ticketId: ticket.ticketId,
    senderId: currentUser.userId,
    senderRole: currentUser.role,
    message:
      'O suporte foi encerrado. Envie uma nova mensagem para iniciar um novo ticket.',
    messageType: 'SYSTEM',
  });

  return { success: true };
};

export const SupportService = {
  createMessage,
  getAllTickets,
  getMessagesByTicketId,
  markReadByAdminOrUser,
  closeTicket,
};
