/* eslint-disable @typescript-eslint/no-explicit-any */
import config from '../config';
import { fcm } from '../config/firebase';

export type TPushNotificationPayload = {
  title: string;
  body: string;
  imageUrl?: string;
  data?: Record<string, string>;
  sound?: string;
  channelId?: 'order_notification' | 'default';
};

export const sendPushNotification = async (
  token: string,
  payload: TPushNotificationPayload,
) => {
  if (!token || token.trim() === '' || token === 'malmo' || token.length < 20) {
    const error = new Error(
      'The registration token is not a valid FCM registration token',
    );
    (error as any).code = 'messaging/invalid-argument';
    throw error;
  }
  try {
    const message = {
      token,
      // Android settings
      android: {
        priority: 'high' as const,
      },
      // iOS
      apns: {
        headers: {
          'apns-priority': '5',
        },
        payload: {
          aps: {
            sound: payload.sound || 'default',
            contentAvailable: true,
          },
        },
      },
      data: {
        title: payload.title,
        body: payload.body,
        imageUrl: payload.imageUrl || '',
        sound: payload.sound || 'default',
        channelId: payload.channelId || 'default',
        ...(payload.data || {}),
      },
    };

    const response = await fcm.send(message);
    return { success: true, response };
  } catch (error: any) {
    const errCode = error?.errorInfo?.code || error?.code;
    const errMsg = error?.message || '';

    const isInvalidToken =
      errCode === 'messaging/registration-token-not-registered' ||
      errCode === 'messaging/invalid-registration-token' ||
      errCode === 'messaging/invalid-argument' ||
      errCode === 'messaging/mismatched-credential' ||
      errMsg.includes('not found') ||
      errMsg.includes('NotRegistered') ||
      errMsg.includes('not a valid FCM registration token') ||
      errMsg.includes('SenderId mismatch');

    if (isInvalidToken) {
      console.warn(
        `[FCM Warning] Expired/Invalid token detected. Forwarding to cleanup flow...`,
      );
    } else {
      console.error('Error sending push notification:', error);
    }

    throw error;
  }
};
export const sendTestPushNotification = async (
  token: string,
  payload: TPushNotificationPayload,
) => {
  try {
    const message = {
      token,

      data: payload.data || {},
      // Android settings
      android: {
        priority: 'high' as const,
        notification: {
          sound:
            payload.sound || payload.channelId === 'order_notification'
              ? 'notification'
              : 'default',
          channelId: payload.channelId || 'default',
          priority: 'high' as const,
        },
      },
      // iOS
      apns: {
        payload: {
          aps: {
            sound: payload.sound || 'default',
            contentAvailable: true,
          },
        },
      },
    };

    const response = await fcm.send(message);
    return { success: true, response };
  } catch (error: any) {
    console.error('Error sending push notification:', error);

    if (
      error.code === 'messaging/registration-token-not-registered' ||
      error.code === 'messaging/invalid-registration-token'
    ) {
      if (config.NODE_ENV === 'development') {
        console.log('Cleanup needed: Token is no longer valid.');
      }
    }

    return { success: false, error: error.message };
  }
};
