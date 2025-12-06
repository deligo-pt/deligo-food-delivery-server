import httpStatus from 'http-status';
import { catchAsync } from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { SupportService } from './support.service';
import { AuthUser } from '../../constant/user.constant';

const openOrCreateConversationController = catchAsync(async (req, res) => {
  const conversation = await SupportService.openOrCreateConversation(
    req.user as AuthUser
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Support conversation opened successfully',
    data: conversation,
  });
});

const getAllSupportConversationsController = catchAsync(async (req, res) => {
  const { meta, data } = await SupportService.getAllSupportConversations(
    req.query
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Support conversations retrieved successfully',
    meta,
    data,
  });
});

const storeSupportMessageController = catchAsync(async (req, res) => {
  const message = await SupportService.storeSupportMessage(
    req.body,
    req.user as AuthUser
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Support message stored successfully',
    data: message,
  });
});

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
    message: 'Support messages retrieved successfully',
    meta: result.meta,
    data: result.data,
  });
});

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

export const SupportControllers = {
  openOrCreateConversationController,
  getAllSupportConversationsController,
  storeSupportMessageController,
  getMessagesByRoomController,
  markReadByAdminOrUserController,
};
