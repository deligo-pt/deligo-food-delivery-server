/* eslint-disable @typescript-eslint/no-explicit-any */
import { fcm } from '../config/firebase';
import { Admin } from '../modules/Admin/admin.model';
import { Customer } from '../modules/Customer/customer.model';
import { DeliveryPartner } from '../modules/Delivery-Partner/delivery-partner.model';
import { FleetManager } from '../modules/Fleet-Manager/fleet-manager.model';
import { Vendor } from '../modules/Vendor/vendor.model';

export type TPushNotificationPayload = {
  title: string;
  body: string;
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
      notification: {
        title: payload.title,
        body: payload.body,
      },
      // Android settings
      android: {
        priority: 'high' as const,
        notification: {
          sound: payload.sound || 'default',
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

      await Promise.all([
        DeliveryPartner.updateMany(
          { fcmTokens: token },
          { $pull: { fcmTokens: token } },
        ),
        Vendor.updateMany(
          { fcmTokens: token },
          { $pull: { fcmTokens: token } },
        ),
        Admin.updateMany({ fcmTokens: token }, { $pull: { fcmTokens: token } }),
        Customer.updateMany(
          { fcmTokens: token },
          { $pull: { fcmTokens: token } },
        ),
        FleetManager.updateMany(
          { fcmTokens: token },
          { $pull: { fcmTokens: token } },
        ),
      ]);
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
      console.log('Cleanup needed: Token is no longer valid.');
    }

    return { success: false, error: error.message };
  }
};
