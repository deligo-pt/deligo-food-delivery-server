import sendResponse from '../../utils/sendResponse';
import httpStatus from 'http-status';
import { catchAsync } from '../../utils/catchAsync';
import { NotificationService } from './notification.service';
import { TCurrentUser } from '../../constant/GlobalInterface/user.interface';
import { TMessageKey } from '../../errors/messages';
import { createActivityLog } from '../ActivityLog/activityLog.utils';

// Get notifications for current user
const getMyNotifications = catchAsync(async (req, res) => {
  const result = await NotificationService.getMyNotifications(
    req.user as TCurrentUser,
    req.query,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    messageKey: result?.messageKey as TMessageKey,
    variables: result?.variables,
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
    messageKey: result?.messageKey as TMessageKey,
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
    messageKey: result?.messageKey as TMessageKey,
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
    messageKey: result?.messageKey as TMessageKey,
    variables: result?.variables,
    meta: result?.meta,
    data: result?.data,
  });
});

// soft delete single notification controller
const softDeleteSingleNotification = catchAsync(async (req, res) => {
  const { id } = req.params;
  const currentUser = req?.user as TCurrentUser;
  const result = await NotificationService.softDeleteSingleNotification(
    id,
    currentUser,
  );

  createActivityLog({
    customUserId: currentUser?.userId,
    action: 'Soft Deleted Notification',
    target: `Notification #${id}`,
    type: 'DANGER',
  });

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: result?.messageKey as TMessageKey,
    data: null,
  });
});

// soft delete multiple notifications controller
const softDeleteMultipleNotifications = catchAsync(async (req, res) => {
  const { notificationIds } = req.body;
  const currentUser = req?.user as TCurrentUser;
  const result = await NotificationService.softDeleteMultipleNotifications(
    notificationIds,
    currentUser,
  );

  createActivityLog({
    customUserId: currentUser?.userId,
    action: 'Soft Deleted Multiple Notifications',
    target: `${notificationIds?.length || 0} Notifications`,
    type: 'DANGER',
  });

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: result?.messageKey as TMessageKey,
    variables: result?.variables,
    data: null,
  });
});

// soft delete all notifications controller
const softDeleteAllNotifications = catchAsync(async (req, res) => {
  const currentUser = req?.user as TCurrentUser;
  const result =
    await NotificationService.softDeleteAllNotifications(currentUser);

  createActivityLog({
    customUserId: currentUser?.userId,
    action: 'Soft Deleted All Notifications',
    target: 'All Notifications',
    type: 'DANGER',
  });

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: result?.messageKey as TMessageKey,
    variables: result?.variables,
    data: null,
  });
});

// Permanent Delete Single Notification Controller
const permanentDeleteSingleNotification = catchAsync(async (req, res) => {
  const { id } = req.params;
  const currentUser = req?.user as TCurrentUser;
  const result = await NotificationService.permanentDeleteSingleNotification(
    id,
    currentUser,
  );

  createActivityLog({
    customUserId: currentUser?.userId,
    action: 'Permanently Deleted Notification',
    target: `Notification #${id}`,
    type: 'DANGER',
  });

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: result?.messageKey as TMessageKey,
    data: null,
  });
});

// Permanent Delete Multiple Notification Controller
const permanentDeleteMultipleNotifications = catchAsync(async (req, res) => {
  const { notificationIds } = req.body;
  const currentUser = req?.user as TCurrentUser;
  const result = await NotificationService.permanentDeleteMultipleNotifications(
    notificationIds,
    currentUser,
  );

  createActivityLog({
    customUserId: currentUser?.userId,
    action: 'Permanently Deleted Multiple Notifications',
    target: `${notificationIds?.length || 0} Notifications`,
    type: 'DANGER',
  });

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: result?.messageKey as TMessageKey,
    variables: result?.variables,
    data: null,
  });
});

// Permanent Delete All Notification Controller
const permanentDeleteAllNotifications = catchAsync(async (req, res) => {
  const currentUser = req?.user as TCurrentUser;
  const result =
    await NotificationService.permanentDeleteAllNotifications(currentUser);

  createActivityLog({
    customUserId: currentUser?.userId,
    action: 'Permanently Deleted All Notifications',
    target: 'All Notifications',
    type: 'DANGER',
  });

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: result?.messageKey as TMessageKey,
    variables: result?.variables,
    data: null,
  });
});

// Broadcast Notification Controller
const sendBroadcastNotification = catchAsync(async (req, res) => {
  const currentUser = req?.user as TCurrentUser;
  const result = await NotificationService.sendBroadcastNotification(req.body);

  createActivityLog({
    customUserId: currentUser?.userId,
    action: 'Sent Broadcast Notification',
    target: req.body?.title || 'Broadcast Notification',
    type: 'INFO',
  });

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: result?.messageKey as TMessageKey,
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
