import httpStatus from 'http-status';
import { catchAsync } from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { SupportService } from './support.service';
import { TCurrentUser } from '../../constant/GlobalInterface/user.interface';

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
    message: result?.message,
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
    message: result?.message,
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
    message: result?.message,
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
    message: result?.message,
    data: result?.data,
  });
});

const closeTicket = catchAsync(async (req, res) => {
  const result = await SupportService.closeTicket(
    req.params.ticketId,
    req.user as TCurrentUser,
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: result?.message,
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
