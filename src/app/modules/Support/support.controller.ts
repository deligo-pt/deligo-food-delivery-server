import httpStatus from 'http-status';
import { catchAsync } from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { SupportService } from './support.service';
import { AuthUser } from '../../constant/user.constant';

// ------------------------------------------------------
//  Open or Create Conversation
// ------------------------------------------------------
const openOrCreateConversationController = catchAsync(async (req, res) => {
  const conversation = await SupportService.openOrCreateConversation(
    req.user as AuthUser,
    req.body
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
const getAllSupportConversationsController = catchAsync(async (req, res) => {
  const { meta, data } = await SupportService.getAllSupportConversations(
    req.query,
    req.user as AuthUser
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
const getSingleSupportConversationController = catchAsync(async (req, res) => {
  const { room } = req.params;
  const result = await SupportService.getSingleSupportConversationController(
    room,
    req.user as AuthUser
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
const getMessagesByRoomController = catchAsync(async (req, res) => {
  const { room } = req.params;

  const result = await SupportService.getMessagesByRoom(
    req.query,
    room,
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

// ------------------------------------------------------
//  Mark Messages as Read
// ------------------------------------------------------
const markReadByAdminOrUserController = catchAsync(async (req, res) => {
  const { room } = req.params;

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

// ------------------------------------------------------
//  Close Conversation (Generic Lock Release)
// ------------------------------------------------------
const closeConversationController = catchAsync(async (req, res) => {
  const { room } = req.params;

  const result = await SupportService.closeConversation(
    room,
    req.user as AuthUser
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Conversation closed successfully',
    data: result,
  });
});

export const SupportControllers = {
  openOrCreateConversationController,
  getAllSupportConversationsController,
  getSingleSupportConversationController,
  getMessagesByRoomController,
  markReadByAdminOrUserController,
  closeConversationController,
};
