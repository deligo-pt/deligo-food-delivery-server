/* eslint-disable @typescript-eslint/no-explicit-any */
import { fcm } from '../config/firebase';

export type TPushNotificationPayload = {
  title: string;
  body: string;
  data?: Record<string, string>;
  sound?: string;
};

export const sendPushNotification = async (
  token: string,
  payload: TPushNotificationPayload
) => {
  try {
    const message = {
      token,
      notification: {
        title: payload.title,
        body: payload.body,
      },
      // Android settings
      android: {
        priority: 'high' as const,
        notification: {
          sound: payload.sound || 'default',
          channelId: 'default_channel',
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
      data: payload.data || {},
    };

    const response = await fcm.send(message);
    return { success: true, response };
  } catch (error: any) {
    console.error('Error sending push notification:', error);

    if (
      error.code === 'messaging/registration-token-not-registered' ||
      error.code === 'messaging/invalid-registration-token'
    ) {
      console.log('Cleanup needed: Token is no longer valid.');
    }

    return { success: false, error: error.message };
  }
};
