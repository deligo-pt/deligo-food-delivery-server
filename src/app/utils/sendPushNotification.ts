import { fcm } from '../config/firebase';

export type TPushNotificationPayload = {
  title: string;
  body: string;
  data?: Record<string, string>;
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
      data: payload.data || {},
    };

    const response = await fcm.send(message);
    // console.log(`Notification sent to token: ${token}`);
    return response;
  } catch (error) {
    console.error('Error sending push notification:', error);
  }
};
