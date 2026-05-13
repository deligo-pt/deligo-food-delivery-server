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
    console.error('Error sending push notification:', error);

    if (
      error.code === 'messaging/registration-token-not-registered' ||
      error.code === 'messaging/invalid-registration-token'
    ) {
      if (config.NODE_ENV === 'development') {
        console.error('Cleanup needed: Token is no longer valid.');
      }
    }

    return { success: false, error: error.message };
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
