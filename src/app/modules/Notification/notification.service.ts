/* eslint-disable @typescript-eslint/no-explicit-any */
import { USER_ROLE } from '../../constant/user.const';
import { findUserByEmailOrId } from '../../utils/findUserByEmailOrId';
import { sendPushNotification } from '../../utils/sendPushNotification';
import { ALL_USER_MODELS } from '../Auth/auth.constant';
import { Notification } from './notification.model';

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

  if (!user || !user.deviceTokens?.length) {
    console.warn(`No tokens found for userId: ${userId}`);
    return;
  }

  // Push notification
  for (const token of user.deviceTokens) {
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
  role: keyof typeof USER_ROLE,
  title: string,
  message: string,
  data?: Record<string, string>,
  type: 'ORDER' | 'SYSTEM' | 'PROMO' | 'ACCOUNT' | 'OTHER' = 'OTHER'
) => {
  const Model = ALL_USER_MODELS.find((m: any) => m.modelName === role);
  if (!Model) return;

  const users = await Model.find({
    isDeleted: false,
    deviceTokens: { $exists: true, $ne: [] },
  });
  for (const user of users) {
    for (const token of user.deviceTokens) {
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

export const NotificationService = {
  sendToUser,
  sendToRole,
};
