/* eslint-disable @typescript-eslint/no-explicit-any */
import httpStatus from 'http-status';
import {
  ROLE_COLLECTION_MAP,
  TUserRole,
} from '../../constant/GlobalConstant/user.constant';
import AppError from '../../errors/AppError';
import { sendPushNotification } from '../../utils/sendPushNotification';
import { ALL_USER_MODELS } from '../Auth/auth.constant';
import { Notification } from './notification.model';
import { QueryBuilder } from '../../builder/QueryBuilder';
import {
  TBroadcastNotificationPayload,
  TNotificationType,
} from './notification.interface';
import { EmailHelper } from '../../utils/emailSender';
import { AuthUser } from '../AuthUser/authUser.model';
import { TAuthUser } from '../AuthUser/authUser.interface';

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
  payload: {
    title: string;
    body: string;
    imageUrl?: string;
    data?: Record<string, string>;
    channelId?: 'order_notification' | 'default';
  },
) => {
  if (!tokens.length) return;

  await Promise.allSettled(
    tokens.map((token) =>
      sendPushNotification(token, payload).catch((err) => {
        console.error('Push send failed:', err);
      }),
    ),
  );
};

//  Send to one user
const sendToUser = (
  userId: string,
  title: string,
  message: string,
  data?: Record<string, string>,
  channelId?: 'order_notification' | 'default',
  type: TNotificationType = 'OTHER',
) => {
  //  Detach from request lifecycle
  setImmediate(async () => {
    try {
      const user = await AuthUser.findOne({ userId });

      if (!user) return;

      const deviceTokens =
        user.loginDevices
          ?.filter((device: any) => {
            if (user.role === 'CUSTOMER') {
              return !!device.fcmToken;
            }
            return device.isLoggedIn === true && device.fcmToken;
          })
          .map((device: any) => device.fcmToken) || [];

      const uniqueTokens = [...new Set((deviceTokens as string[]) || [])];

      if (uniqueTokens.length > 0) {
        // Push notification (parallel)
        await sendPushSafely(uniqueTokens, {
          title,
          body: message,
          data,
          channelId: channelId || 'default',
        });
      }

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

// Send to role(s)
const sendToRole = (
  modelName: string,
  roles: TUserRole[],
  title: string,
  message: string,
  data?: Record<string, string>,
  channelId?: 'order_notification' | 'default',
  type: TNotificationType = 'OTHER',
) => {
  setImmediate(async () => {
    try {
      const Model = ALL_USER_MODELS.find((m: any) => m.modelName === modelName);
      if (!Model) return;

      const users = await Model.find({
        isDeleted: false,
        role: { $in: roles },
        loginDevices: {
          $elemMatch: {
            isLoggedIn: true,
            fcmToken: { $exists: true, $ne: '' },
          },
        },
      });

      for (const user of users) {
        const deviceTokens =
          user.loginDevices
            ?.filter(
              (device: any) => device.isLoggedIn === true && device.fcmToken,
            )
            .map((device: any) => device.fcmToken) || [];
        const uniqueTokens = [...new Set((deviceTokens as string[]) || [])];

        if (uniqueTokens.length > 0) {
          await sendPushSafely(uniqueTokens, {
            title,
            body: message,
            data,
            channelId: channelId || 'default',
          });
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
    } catch (err) {
      console.error('sendToRole notification failed:', err);
    }
  });
};

// mark as read (one)
const markAsRead = async (id: string, currentUser: TAuthUser) => {
  const notification = await Notification.findById(id);
  if (!notification) {
    throw new AppError(httpStatus.NOT_FOUND, 'Notification not found');
  }

  if (currentUser.userId !== notification.receiverId) {
    throw new AppError(
      httpStatus.UNAUTHORIZED,
      'You are not authorized to perform this action',
    );
  }

  notification.isRead = true;
  await notification.save();
};

// mark as read (all)
const markAllAsRead = async (currentUser: TAuthUser) => {
  await Notification.updateMany(
    { receiverId: currentUser.userId },
    { isRead: true },
  );
  return null;
};

const getMyNotifications = async (
  currentUser: TAuthUser,
  query: Record<string, unknown>,
) => {
  const notifications = new QueryBuilder(
    Notification.find({
      receiverId: currentUser.userId,
    }),
    query,
  )
    .filter()
    .fields()
    .paginate()
    .sort()
    .search(['title', 'message', 'receiverRole']);
  const meta = await notifications.countTotal();
  const data = await notifications.modelQuery;
  return {
    meta,
    data,
  };
};

// Get all notifications
const getAllNotifications = async (
  currentUser: TAuthUser,
  query: Record<string, unknown>,
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
  currentUser: TAuthUser,
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
      'Notification not found or access denied',
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
  currentUser: TAuthUser,
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
const softDeleteAllNotifications = async (currentUser: TAuthUser) => {
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
  currentUser: TAuthUser,
) => {
  // --------------------------------------------------
  // Only SUPER_ADMIN allowed
  // --------------------------------------------------
  if (currentUser.role !== 'SUPER_ADMIN') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'Only super admin can permanently delete notifications',
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
      'Notification must be soft deleted before permanent delete',
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
  currentUser: TAuthUser,
) => {
  if (currentUser.role !== 'SUPER_ADMIN') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'Only super admin can permanently delete notifications',
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
      'Selected notifications must be soft deleted first',
    );
  }

  return {
    message: `${result.deletedCount} notifications permanently deleted successfully`,
  };
};

// permanent delete all notifications - only for super admin
const permanentDeleteAllNotifications = async (currentUser: TAuthUser) => {
  if (currentUser.role !== 'SUPER_ADMIN') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'Only super admin can permanently delete notifications',
    );
  }

  const result = await Notification.deleteMany({
    isDeleted: true,
  });

  if (result.deletedCount === 0) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'No soft-deleted notifications found to permanently delete',
    );
  }

  return {
    message: `${result.deletedCount} notifications permanently deleted successfully`,
  };
};

const sendBroadcastNotification = async (
  payload: TBroadcastNotificationPayload,
) => {
  const {
    communicationType,
    targetAudience,
    customUserIds,
    title,
    body,
    imageUrl,
    data,
    type = 'PROMOTIONAL',
  } = payload;

  for (const role of targetAudience) {
    const modelName =
      ROLE_COLLECTION_MAP[role as keyof typeof ROLE_COLLECTION_MAP];
    const Model = ALL_USER_MODELS.find((m: any) => m.modelName === modelName);
    if (!Model) continue;

    const query: any = {
      isDeleted: false,
      role: role.toLocaleUpperCase() as TUserRole,
    };

    if (customUserIds && customUserIds.length > 0) {
      query.userId = { $in: customUserIds };
    }

    if (communicationType !== 'EMAIL') {
      query.loginDevices = {
        $elemMatch: {
          fcmToken: { $exists: true, $ne: '' },
        },
      };
    }

    const userCursor = Model.find(query).cursor();

    setImmediate(async () => {
      try {
        for (
          let user = await userCursor.next();
          user != null;
          user = await userCursor.next()
        ) {
          const userName = user.name?.firstName || 'User';
          const personalizedBody = body.replace(/{name}/g, userName);

          if (communicationType === 'PUSH' || communicationType === 'BOTH') {
            const allStoredTokens =
              user.loginDevices
                ?.filter((d: any) => d.fcmToken)
                .map((d: any) => d.fcmToken) || [];

            const uniqueTokens = [...new Set(allStoredTokens as string[])];

            if (uniqueTokens.length > 0) {
              await sendPushSafely(uniqueTokens, {
                title,
                body: personalizedBody,
                imageUrl,
                data: { ...data, type },
                channelId: 'default',
              });
            }
          }

          if (
            (communicationType === 'EMAIL' || communicationType === 'BOTH') &&
            user.email
          ) {
            const emailData = {
              title,
              personalizedBody,
              imageUrl,
              currentYear: new Date().getFullYear(),
              data: data || {},
            };
            EmailHelper.createEmailContent(emailData, 'broadcast-email')
              .then((htmlContent) => {
                return EmailHelper.sendEmail(user.email, htmlContent, title);
              })
              .catch((err) => {
                console.error(
                  `Email delivery failed for ${user.email}:`,
                  err.message,
                );
              });
          }

          await logNotification({
            receiverId: user.userId,
            receiverRole: user.role,
            title,
            message: personalizedBody,
            data,
            type,
          });
        }
      } catch (error) {
        console.error(`Broadcast failed for role ${role}:`, error);
      }
    });
  }

  return { success: true, message: 'Broadcast processing started' };
};

export const NotificationService = {
  sendToUser,
  sendToRole,
  markAsRead,
  markAllAsRead,
  getMyNotifications,
  getAllNotifications,
  softDeleteSingleNotification,
  softDeleteMultipleNotifications,
  softDeleteAllNotifications,
  permanentDeleteSingleNotification,
  permanentDeleteMultipleNotifications,
  permanentDeleteAllNotifications,
  sendBroadcastNotification,
};
