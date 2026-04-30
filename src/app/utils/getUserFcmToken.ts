import { findUserById } from './findUserByEmailOrId';

export const getUserFcmToken = async (
  customUserId: string,
): Promise<string[] | null> => {
  const { user } = await findUserById({ customUserId });

  if (!user || !user.fcmTokens || user.fcmTokens.length === 0) {
    console.warn(`No fcm tokens found for user: ${customUserId}`);
    return null;
  }

  return user.fcmTokens;
};
