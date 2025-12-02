import httpStatus from 'http-status';
import { catchAsync } from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { SupportService } from './support.service';
import { AuthUser } from '../../constant/user.constant';

// Controller to open or create a support conversation
const openOrCreateConversationController = catchAsync(async (req, res) => {
  const result = await SupportService.openOrCreateConversation(
    req.user as AuthUser
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Support conversation opened successfully',
    data: result,
  });
});

// Get all support conversations controller
const getAllSupportConversations = catchAsync(async (req, res) => {
  const result = await SupportService.getAllSupportConversations(req.query);
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Support conversations retrieved successfully',
    meta: result.meta,
    data: result.data,
  });
});

// Store support message controller
const storeSupportMessageController = catchAsync(async (req, res) => {
  const result = await SupportService.storeSupportMessage(
    req.body,
    req.user as AuthUser
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Support message stored successfully',
    data: result,
  });
});

// get messages by room controller
const getMessagesByRoom = catchAsync(async (req, res) => {
  const result = await SupportService.getMessagesByRoom(
    req.query,
    req.params.room,
    req.user as AuthUser
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Messages retrieved successfully',
    meta: result.meta,
    data: result.data,
  });
});

// mark messages as read by admin or user controller
const markMessagesAsRead = catchAsync(async (req, res) => {
  const { room } = req.body;
  const result = await SupportService.markReadByAdminOrUser(
    room,
    req.user as AuthUser
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Messages marked as read successfully',
    data: result,
  });
});

export const SupportControllers = {
  openOrCreateConversationController,
  getAllSupportConversations,
  storeSupportMessageController,
  getMessagesByRoom,
  markMessagesAsRead,
};
