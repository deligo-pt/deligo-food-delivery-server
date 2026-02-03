import { findUserById } from './findUserByEmailOrId';

export const getUserFcmToken = async (
  userId: string,
): Promise<string[] | null> => {
  const { user } = await findUserById({ userId });

  if (!user || !user.fcmTokens || user.fcmTokens.length === 0) {
    console.warn(`No fcm tokens found for userId: ${userId}`);
    return null;
  }

  return user.fcmTokens;
};
