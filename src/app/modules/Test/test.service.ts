import httpStatus from 'http-status';
import AppError from '../../errors/AppError';
import { sendPushNotification } from '../../utils/sendPushNotification';

const getNotificationByToken = async (payload: { token: string }) => {
  const { token } = payload;

  if (!token) {
    throw new AppError(httpStatus.BAD_REQUEST, 'FCM Token is required');
  }

  const hardcodedPayload = {
    title: 'System Update',
    body: 'Your request has been processed successfully.',
    data: {
      key: 'value',
      type: 'SYSTEM_ALERT',
      click_action: 'FLUTTER_NOTIFICATION_CLICK',
    },
    channelId: 'default' as const,
    sound: 'default' as const,
  };

  const result = await sendPushNotification(token, hardcodedPayload);

  if (!result.success) {
    console.error(result.error);

    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      `FCM Failed: ${result.error}`,
    );
  }

  return {
    message: 'Notification sent successfully',
    data: result.response,
  };
};

export const TestService = {
  getNotificationByToken,
};
