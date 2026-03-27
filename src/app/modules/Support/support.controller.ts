import httpStatus from 'http-status';
import { catchAsync } from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { SupportService } from './support.service';
import { AuthUser } from '../../constant/user.constant';

const sendMessage = catchAsync(async (req, res) => {
  // We send the whole body and req.user to service
  // Service will handle model mapping and role generation
  const result = await SupportService.createMessage(
    req.body,
    req.user as AuthUser,
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: 'Message processed successfully',
    data: result,
  });
});

const getAllTickets = catchAsync(async (req, res) => {
  const { meta, data } = await SupportService.getAllTickets(req.query);
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Tickets retrieved',
    meta,
    data,
  });
});

const getMessagesByRoom = catchAsync(async (req, res) => {
  const { meta, data } = await SupportService.getMessagesByRoom(
    req.params.room,
    req.query,
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Chat history retrieved',
    meta,
    data,
  });
});

const closeTicket = catchAsync(async (req, res) => {
  const result = await SupportService.closeTicket(
    req.params.room,
    (req.user as AuthUser).userId,
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Ticket closed',
    data: result,
  });
});

const markAsRead = catchAsync(async (req, res) => {
  const result = await SupportService.markReadByAdminOrUser(
    req.params.room,
    (req.user as AuthUser).userId,
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Messages read',
    data: result,
  });
});

export const SupportControllers = {
  sendMessage,
  getAllTickets,
  getMessagesByRoom,
  closeTicket,
  markAsRead,
};
