import { Notification } from './notification.model';
import sendResponse from '../../utils/sendResponse';
import httpStatus from 'http-status';
import { catchAsync } from '../../utils/catchAsync';

// Get notifications for current user
const getMyNotifications = catchAsync(async (req, res) => {
  const user = req.user;
  const notifications = await Notification.find({ receiverId: user.id })
    .sort({ createdAt: -1 })
    .lean();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Notifications fetched successfully',
    data: notifications,
  });
});

// Mark as read
const markAsRead = catchAsync(async (req, res) => {
  const { id } = req.params;
  await Notification.findByIdAndUpdate(id, { isRead: true });
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Notification marked as read',
    data: null,
  });
});

// Admin: Get all notifications
const getAllNotifications = catchAsync(async (req, res) => {
  const notifications = await Notification.find().sort({ createdAt: -1 });
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'All notifications retrieved successfully',
    data: notifications,
  });
});

export const NotificationControllers = {
  getMyNotifications,
  markAsRead,
  getAllNotifications,
};
