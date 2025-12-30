import { Notification } from './notification.model';
import sendResponse from '../../utils/sendResponse';
import httpStatus from 'http-status';
import { catchAsync } from '../../utils/catchAsync';
import { NotificationService } from './notification.service';
import { AuthUser } from '../../constant/user.constant';

// Get notifications for current user
const getMyNotifications = catchAsync(async (req, res) => {
  const user = req.user;
  const notifications = await Notification.find({ receiverId: user.id })
    .sort({ createdAt: -1 })
    .lean();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Notifications retrieved successfully',
    data: notifications,
  });
});

// Mark as read (one)
const markAsRead = catchAsync(async (req, res) => {
  const { id } = req.params;
  await NotificationService.markAsRead(id, req?.user as AuthUser);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Notification marked as read',
    data: null,
  });
});

// Mark as read (all)
const markAllAsRead = catchAsync(async (req, res) => {
  await NotificationService.markAllAsRead(req?.user as AuthUser);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'All notifications marked as read',
    data: null,
  });
});

// Admin: Get all notifications
const getAllNotifications = catchAsync(async (req, res) => {
  const result = await NotificationService.getAllNotifications(
    req.user as AuthUser,
    req.query
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'All notifications retrieved successfully',
    meta: result?.meta,
    data: result?.data,
  });
});

// soft delete single notification controller
const softDeleteSingleNotification = catchAsync(async (req, res) => {
  const { id } = req.params;
  const result = await NotificationService.softDeleteSingleNotification(
    id,
    req?.user as AuthUser
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
    req?.user as AuthUser
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
    req?.user as AuthUser
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
    req?.user as AuthUser
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
    req?.user as AuthUser
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
    req?.user as AuthUser
  );
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
};
