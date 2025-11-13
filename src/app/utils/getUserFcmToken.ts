import { findUserByEmailOrId } from './findUserByEmailOrId';

export const getUserFcmToken = async (
  userId: string
): Promise<string[] | null> => {
  const result = await findUserByEmailOrId({ userId, isDeleted: false });
  const user = result?.user;

  if (!user || !user.fcmTokens || user.fcmTokens.length === 0) {
    console.warn(`No fcm tokens found for userId: ${userId}`);
    return null;
  }
  console.log(user.fcmTokens);

  return user.fcmTokens;
};
