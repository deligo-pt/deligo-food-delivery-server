/* eslint-disable @typescript-eslint/no-explicit-any */
import httpStatus from 'http-status';
import { AuthUser, USER_ROLE } from '../../constant/user.constant';
import AppError from '../../errors/AppError';
import { findUserByEmailOrId } from '../../utils/findUserByEmailOrId';
import { sendPushNotification } from '../../utils/sendPushNotification';
import { ALL_USER_MODELS } from '../Auth/auth.constant';
import { Notification } from './notification.model';
import { QueryBuilder } from '../../builder/QueryBuilder';

//  Helper: Save Notification Log
const logNotification = async ({
  receiverId,
  receiverRole,
  title,
  message,
  data,
  type = 'OTHER',
}: {
  receiverId: string;
  receiverRole: string;
  title: string;
  message: string;
  data?: Record<string, string>;
  type?: string;
}) => {
  await Notification.create({
    receiverId,
    receiverRole,
    title,
    message,
    data,
    type,
    isRead: false,
  });
};

//  Send to one user
const sendToUser = async (
  userId: string,
  title: string,
  message: string,
  data?: Record<string, string>,
  type: 'ORDER' | 'SYSTEM' | 'PROMO' | 'ACCOUNT' | 'OTHER' = 'OTHER'
) => {
  const result = await findUserByEmailOrId({ userId, isDeleted: false });
  const user = result?.user;

  if (!user) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      `No user found for userId: ${userId}`
    );
  }

  const uniqueTokens = [...new Set(user.fcmTokens as string[])];
  // Push notification
  for (const token of uniqueTokens) {
    await sendPushNotification(token, {
      title,
      body: message,
      data,
    });
  }

  // Log in DB
  await logNotification({
    receiverId: user.userId,
    receiverRole: user.role,
    title,
    message,
    data,
    type,
  });
};

//  Send to role (bulk)
const sendToRole = async (
  modelName: string,
  roles: (keyof typeof USER_ROLE)[],
  title: string,
  message: string,
  data?: Record<string, string>,
  type: 'ORDER' | 'SYSTEM' | 'PROMO' | 'ACCOUNT' | 'OTHER' = 'OTHER'
) => {
  const Model = ALL_USER_MODELS.find((m: any) => m.modelName === modelName);
  if (!Model) return;
  const users = await Model.find({
    isDeleted: false,
    fcmTokens: { $exists: true, $ne: [] },
    role: { $in: roles },
  });
  for (const user of users) {
    for (const token of user.fcmTokens) {
      await sendPushNotification(token, { title, body: message, data });
    }

    await logNotification({
      receiverId: user.userId,
      receiverRole: user.role,
      title,
      message,
      data,
      type,
    });
  }
};

// mark as read (one)
const markAsRead = async (id: string, currentUser: AuthUser) => {
  const result = await findUserByEmailOrId({
    userId: currentUser.id,
    isDeleted: false,
  });
  const user = result?.user;

  const notification = await Notification.findById(id);
  if (!notification) {
    throw new AppError(httpStatus.NOT_FOUND, 'Notification not found');
  }

  if (user.userId !== notification.receiverId) {
    throw new AppError(
      httpStatus.UNAUTHORIZED,
      'You are not authorized to perform this action'
    );
  }

  notification.isRead = true;
  await notification.save();
};

// mark as read (all)
const markAllAsRead = async (currentUser: AuthUser) => {
  const result = await findUserByEmailOrId({
    userId: currentUser.id,
    isDeleted: false,
  });
  const user = result?.user;
  await Notification.updateMany({ receiverId: user.userId }, { isRead: true });
  return null;
};

// Get all notifications
const getAllNotifications = async (
  currentUser: AuthUser,
  query: Record<string, unknown>
) => {
  await findUserByEmailOrId({
    userId: currentUser.id,
    isDeleted: false,
  });

  if (currentUser.role !== 'ADMIN' && currentUser.role !== 'SUPER_ADMIN') {
    query.receiverId = currentUser.id;
  }

  const notifications = new QueryBuilder(Notification.find(), query)
    .fields()
    .paginate()
    .sort()
    .filter()
    .search(['title', 'message', 'receiverRole']);

  const meta = await notifications.countTotal();
  const data = await notifications.modelQuery;
  return { meta, data };
};

export const NotificationService = {
  sendToUser,
  sendToRole,
  markAsRead,
  markAllAsRead,
  getAllNotifications,
};
