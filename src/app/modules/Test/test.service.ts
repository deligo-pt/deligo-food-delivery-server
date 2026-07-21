import httpStatus from 'http-status';
import AppError from '../../errors/AppError';
import { sendTestPushNotification } from '../../utils/sendPushNotification';
import { TMessageKey } from '../../errors/messages';

const getNotificationByToken = async (payload: { token: string }) => {
  const { token } = payload;

  if (!token) {
    throw new AppError(httpStatus.BAD_REQUEST, 'FCM_TOKEN_REQUIRED');
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

  const result = await sendTestPushNotification(token, hardcodedPayload);

  if (!result.success) {
    void result.error;

    throw new AppError(httpStatus.INTERNAL_SERVER_ERROR, 'FCM_FAILED', {
      error: String(result.error),
    });
  }

  return {
    messageKey: 'NOTIFICATION_SENT_SUCCESS' as TMessageKey,
    data: result.response,
  };
};

export const TestService = {
  getNotificationByToken,
};
