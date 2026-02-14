import httpStatus from 'http-status';
import { catchAsync } from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { SupportService } from './support.service';
import { AuthUser } from '../../constant/user.constant';

// ------------------------------------------------------
//  Open or Create Conversation
// ------------------------------------------------------
const openOrCreateConversation = catchAsync(async (req, res) => {
  const conversation = await SupportService.openOrCreateConversation(
    req.user as AuthUser,
    req.body,
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Conversation opened successfully',
    data: conversation,
  });
});

// ------------------------------------------------------
//  Get Conversations (Generic)
// ------------------------------------------------------
const getAllSupportConversations = catchAsync(async (req, res) => {
  const { meta, data } = await SupportService.getAllSupportConversations(
    req.query,
    req.user as AuthUser,
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Conversations retrieved successfully',
    meta,
    data,
  });
});

// ------------------------------------------------------
//  Get Single Conversation
// ------------------------------------------------------
const getSingleSupportConversation = catchAsync(async (req, res) => {
  const { room } = req.params;
  const result = await SupportService.getSingleSupportConversation(
    room,
    req.user as AuthUser,
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Conversation retrieved successfully',
    data: result,
  });
});

// ------------------------------------------------------
//  Get Messages by Room
// ------------------------------------------------------
const getMessagesByRoom = catchAsync(async (req, res) => {
  const { room } = req.params;

  const result = await SupportService.getMessagesByRoom(
    req.query,
    room,
    req.user as AuthUser,
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Messages retrieved successfully',
    meta: result.meta,
    data: result.data,
  });
});

// ------------------------------------------------------
//  Mark Messages as Read
// ------------------------------------------------------
const markReadByAdminOrUser = catchAsync(async (req, res) => {
  const { room } = req.params;

  const result = await SupportService.markReadByAdminOrUser(
    room,
    req.user as AuthUser,
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Messages marked as read successfully',
    data: result,
  });
});

// ------------------------------------------------------
// Get total unread count
// ------------------------------------------------------
const getTotalUnreadCount = catchAsync(async (req, res) => {
  const result = await SupportService.getTotalUnreadCount(req.user as AuthUser);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Total unread count retrieved successfully',
    data: result?.totalUnread,
  });
});

// ------------------------------------------------------
//  Close Conversation (Generic Lock Release)
// ------------------------------------------------------
const closeConversation = catchAsync(async (req, res) => {
  const { room } = req.params;

  const result = await SupportService.closeConversation(
    room,
    req.user as AuthUser,
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Conversation closed successfully',
    data: result,
  });
});

export const SupportControllers = {
  openOrCreateConversation,
  getAllSupportConversations,
  getSingleSupportConversation,
  getMessagesByRoom,
  markReadByAdminOrUser,
  getTotalUnreadCount,
  closeConversation,
};
