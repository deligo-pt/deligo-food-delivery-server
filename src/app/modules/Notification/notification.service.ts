/* eslint-disable @typescript-eslint/no-explicit-any */
import httpStatus from 'http-status';
import { AuthUser, TUserRole } from '../../constant/user.constant';
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

//  Helper: Send Push Notification
const sendPushSafely = async (
  tokens: string[],
  payload: { title: string; body: string; data?: Record<string, string> }
) => {
  if (!tokens.length) return;

  await Promise.allSettled(
    tokens.map((token) =>
      sendPushNotification(token, payload).catch((err) => {
        console.error('Push send failed:', err);
      })
    )
  );
};

//  Send to one user
const sendToUser = (
  userId: string,
  title: string,
  message: string,
  data?: Record<string, string>,
  type: 'ORDER' | 'SYSTEM' | 'PROMO' | 'ACCOUNT' | 'OTHER' = 'OTHER'
) => {
  // 🔥 Detach from request lifecycle
  setImmediate(async () => {
    try {
      const result = await findUserByEmailOrId({
        userId,
        isDeleted: false,
      });

      const user = result?.user;
      if (!user) return;

      const uniqueTokens = [...new Set((user.fcmTokens as string[]) || [])];

      // Push notification (parallel)
      await sendPushSafely(uniqueTokens, {
        title,
        body: message,
        data,
      });

      // Save log (DB)
      await logNotification({
        receiverId: user.userId,
        receiverRole: user.role,
        title,
        message,
        data,
        type,
      });
    } catch (err) {
      console.error('sendToUser notification failed:', err);
    }
  });
};

//  Send to role (bulk)
const sendToRole = (
  modelName: string,
  roles: TUserRole[],
  title: string,
  message: string,
  data?: Record<string, string>,
  type: 'ORDER' | 'SYSTEM' | 'PROMO' | 'ACCOUNT' | 'OTHER' = 'OTHER'
) => {
  setImmediate(async () => {
    try {
      const Model = ALL_USER_MODELS.find((m: any) => m.modelName === modelName);
      if (!Model) return;

      const users = await Model.find({
        isDeleted: false,
        fcmTokens: { $exists: true, $ne: [] },
        role: { $in: roles },
      });

      for (const user of users) {
        const uniqueTokens = [...new Set((user.fcmTokens as string[]) || [])];

        await sendPushSafely(uniqueTokens, {
          title,
          body: message,
          data,
        });

        await logNotification({
          receiverId: user.userId,
          receiverRole: user.role,
          title,
          message,
          data,
          type,
        });
      }
    } catch (err) {
      console.error('sendToRole notification failed:', err);
    }
  });
};

// mark as read (one)
const markAsRead = async (id: string, currentUser: AuthUser) => {
  const { user } = await findUserByEmailOrId({
    userId: currentUser.id,
    isDeleted: false,
  });

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
  const { user } = await findUserByEmailOrId({
    userId: currentUser.id,
    isDeleted: false,
  });
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
