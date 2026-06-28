import sendResponse from '../../utils/sendResponse';
import httpStatus from 'http-status';
import { catchAsync } from '../../utils/catchAsync';
import { NotificationService } from './notification.service';
import { TCurrentUser } from '../../constant/GlobalInterface/user.interface';

// Get notifications for current user
const getMyNotifications = catchAsync(async (req, res) => {
  const result = await NotificationService.getMyNotifications(
    req.user as TCurrentUser,
    req.query,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result?.message,
    meta: result?.meta,
    data: result?.data,
  });
});

// Mark as read (one)
const markAsRead = catchAsync(async (req, res) => {
  const { id } = req.params;
  const result = await NotificationService.markAsRead(
    id,
    req?.user as TCurrentUser,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result?.message,
    data: result?.data,
  });
});

// Mark as read (all)
const markAllAsRead = catchAsync(async (req, res) => {
  const result = await NotificationService.markAllAsRead(
    req?.user as TCurrentUser,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result?.message,
    data: result?.data,
  });
});

// Admin: Get all notifications
const getAllNotifications = catchAsync(async (req, res) => {
  const result = await NotificationService.getAllNotifications(
    req.user as TCurrentUser,
    req.query,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result?.message,
    meta: result?.meta,
    data: result?.data,
  });
});

// soft delete single notification controller
const softDeleteSingleNotification = catchAsync(async (req, res) => {
  const { id } = req.params;
  const result = await NotificationService.softDeleteSingleNotification(
    id,
    req?.user as TCurrentUser,
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: result?.message,
    data: null,
  });
});

// soft delete multiple notifications controller
const softDeleteMultipleNotifications = catchAsync(async (req, res) => {
  const { notificationIds } = req.body;
  const result = await NotificationService.softDeleteMultipleNotifications(
    notificationIds,
    req?.user as TCurrentUser,
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: result?.message,
    data: null,
  });
});

// soft delete all notifications controller
const softDeleteAllNotifications = catchAsync(async (req, res) => {
  const result = await NotificationService.softDeleteAllNotifications(
    req?.user as TCurrentUser,
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: result?.message,
    data: null,
  });
});

// Permanent Delete Single Notification Controller
const permanentDeleteSingleNotification = catchAsync(async (req, res) => {
  const { id } = req.params;
  const result = await NotificationService.permanentDeleteSingleNotification(
    id,
    req?.user as TCurrentUser,
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: result?.message,
    data: null,
  });
});

// Permanent Delete Multiple Notification Controller
const permanentDeleteMultipleNotifications = catchAsync(async (req, res) => {
  const { notificationIds } = req.body;
  const result = await NotificationService.permanentDeleteMultipleNotifications(
    notificationIds,
    req?.user as TCurrentUser,
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: result?.message,
    data: null,
  });
});

// Permanent Delete All Notification Controller
const permanentDeleteAllNotifications = catchAsync(async (req, res) => {
  const result = await NotificationService.permanentDeleteAllNotifications(
    req?.user as TCurrentUser,
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: result?.message,
    data: null,
  });
});

// Broadcast Notification Controller
const sendBroadcastNotification = catchAsync(async (req, res) => {
  const result = await NotificationService.sendBroadcastNotification(req.body);
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: result?.message,
    data: null,
  });
});

export const NotificationControllers = {
  getMyNotifications,
  markAsRead,
  markAllAsRead,
  getAllNotifications,
  softDeleteSingleNotification,
  softDeleteMultipleNotifications,
  softDeleteAllNotifications,
  permanentDeleteSingleNotification,
  permanentDeleteMultipleNotifications,
  permanentDeleteAllNotifications,
  sendBroadcastNotification,
};
