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
  //  Detach from request lifecycle
  setImmediate(async () => {
    try {
      const { user } = await findUserByEmailOrId({
        userId,
        isDeleted: false,
      });

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
  const notification = await Notification.findById(id);
  if (!notification) {
    throw new AppError(httpStatus.NOT_FOUND, 'Notification not found');
  }

  if (currentUser.userId !== notification.receiverId) {
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
  await Notification.updateMany(
    { receiverId: currentUser.userId },
    { isRead: true }
  );
  return null;
};

// Get all notifications
const getAllNotifications = async (
  currentUser: AuthUser,
  query: Record<string, unknown>
) => {
  if (currentUser.role !== 'ADMIN' && currentUser.role !== 'SUPER_ADMIN') {
    query.receiverId = currentUser.userId;
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

// soft delete single notification
const softDeleteSingleNotification = async (
  id: string,
  currentUser: AuthUser
) => {
  // --------------------------------------------------
  // Build query condition
  // --------------------------------------------------
  const query: any = {
    _id: id,
    isDeleted: false,
  };

  // If NOT super admin, restrict to own notification
  if (currentUser.role !== 'SUPER_ADMIN') {
    query.receiverId = currentUser.userId;
  }

  // --------------------------------------------------
  // Find notification
  // --------------------------------------------------
  const notification = await Notification.findOne(query);

  if (!notification) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      'Notification not found or access denied'
    );
  }

  // --------------------------------------------------
  // Soft delete
  // --------------------------------------------------
  notification.isDeleted = true;
  await notification.save();

  return {
    message: 'Notification deleted successfully',
  };
};

// soft delete multiple notifications
const softDeleteMultipleNotifications = async (
  notificationIds: string[],
  currentUser: AuthUser
) => {
  if (!notificationIds.length) {
    throw new AppError(httpStatus.BAD_REQUEST, 'No notifications selected');
  }

  // --------------------------------------------------
  // Build delete condition
  // --------------------------------------------------
  const query: any = {
    _id: { $in: notificationIds },
    isDeleted: false,
  };

  // Restrict only if NOT super admin
  if (currentUser.role !== 'SUPER_ADMIN') {
    query.receiverId = currentUser.userId;
  }

  // --------------------------------------------------
  // Bulk soft delete
  // --------------------------------------------------
  const result = await Notification.updateMany(query, {
    $set: { isDeleted: true },
  });

  return {
    message: `${result.modifiedCount} notifications deleted successfully`,
  };
};

// soft delete all notifications
const softDeleteAllNotifications = async (currentUser: AuthUser) => {
  // --------------------------------------------------
  // Build query condition
  // --------------------------------------------------
  const query: any = {
    isDeleted: false,
  };

  // Only restrict if NOT super admin
  if (currentUser.role !== 'SUPER_ADMIN') {
    query.receiverId = currentUser.userId;
  }

  // --------------------------------------------------
  // Bulk soft delete
  // --------------------------------------------------
  const result = await Notification.updateMany(query, {
    $set: { isDeleted: true },
  });

  return {
    message: `${result.modifiedCount} notifications deleted successfully`,
  };
};

// permanent delete single notification - only for super admin
const permanentDeleteSingleNotification = async (
  id: string,
  currentUser: AuthUser
) => {
  // --------------------------------------------------
  // Only SUPER_ADMIN allowed
  // --------------------------------------------------
  if (currentUser.role !== 'SUPER_ADMIN') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'Only super admin can permanently delete notifications'
    );
  }

  // --------------------------------------------------
  // Must be soft deleted first
  // --------------------------------------------------
  const notification = await Notification.findOne({
    _id: id,
    isDeleted: true,
  });

  if (!notification) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Notification must be soft deleted before permanent delete'
    );
  }

  await Notification.deleteOne({ _id: id });

  return {
    message: 'Notification permanently deleted successfully',
  };
};

// permanent delete multiple notifications - only for super admin
const permanentDeleteMultipleNotifications = async (
  notificationIds: string[],
  currentUser: AuthUser
) => {
  if (currentUser.role !== 'SUPER_ADMIN') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'Only super admin can permanently delete notifications'
    );
  }

  if (!notificationIds.length) {
    throw new AppError(httpStatus.BAD_REQUEST, 'No notifications selected');
  }

  // --------------------------------------------------
  // Delete ONLY already soft-deleted notifications
  // --------------------------------------------------
  const result = await Notification.deleteMany({
    _id: { $in: notificationIds },
    isDeleted: true,
  });

  if (result.deletedCount === 0) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Selected notifications must be soft deleted first'
    );
  }

  return {
    message: `${result.deletedCount} notifications permanently deleted successfully`,
  };
};

// permanent delete all notifications - only for super admin
const permanentDeleteAllNotifications = async (currentUser: AuthUser) => {
  if (currentUser.role !== 'SUPER_ADMIN') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'Only super admin can permanently delete notifications'
    );
  }

  const result = await Notification.deleteMany({
    isDeleted: true,
  });

  if (result.deletedCount === 0) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'No soft-deleted notifications found to permanently delete'
    );
  }

  return {
    message: `${result.deletedCount} notifications permanently deleted successfully`,
  };
};

export const NotificationService = {
  sendToUser,
  sendToRole,
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
