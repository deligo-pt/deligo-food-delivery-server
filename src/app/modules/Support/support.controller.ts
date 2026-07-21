import httpStatus from 'http-status';
import { catchAsync } from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { SupportService } from './support.service';
import { TCurrentUser } from '../../constant/GlobalInterface/user.interface';
import { TMessageKey } from '../../errors/messages';
import { createActivityLog } from '../ActivityLog/activityLog.utils';

const sendMessage = catchAsync(async (req, res) => {
  // We send the whole body and req.user to service
  // Service will handle model mapping and role generation
  const result = await SupportService.createMessage(
    req.body,
    req.user as TCurrentUser,
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    messageKey: result?.messageKey as TMessageKey,
    data: result?.data,
  });
});

const getAllTickets = catchAsync(async (req, res) => {
  const result = await SupportService.getAllTickets(
    req.query,
    req.user as TCurrentUser,
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: result?.messageKey as TMessageKey,
    meta: result?.meta,
    data: result?.data,
  });
});

const getMessagesByTicketId = catchAsync(async (req, res) => {
  const result = await SupportService.getMessagesByTicketId(
    req.params.ticketId,
    req.query,
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: result?.messageKey as TMessageKey,
    meta: result?.meta,
    data: result?.data,
  });
});

const markAsRead = catchAsync(async (req, res) => {
  const result = await SupportService.markReadByAdminOrUser(
    req.params.ticketId,
    req.user as TCurrentUser,
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: result?.messageKey as TMessageKey,
    data: result?.data,
  });
});

const closeTicket = catchAsync(async (req, res) => {
  const currentUser = req.user as TCurrentUser;
  const ticketId = req.params.ticketId;
  const result = await SupportService.closeTicket(ticketId, currentUser);

  createActivityLog({
    customUserId: currentUser?.userId,
    action: 'Closed Support Ticket',
    target: `Support Ticket #${ticketId}`,
    type: 'WARNING',
  });

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: result?.messageKey as TMessageKey,
    data: result?.data,
  });
});

export const SupportControllers = {
  sendMessage,
  getAllTickets,
  getMessagesByTicketId,
  markAsRead,
  closeTicket,
};
