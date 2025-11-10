import { findUserByEmailOrId } from './findUserByEmailOrId';

export const getUserFcmToken = async (
  userId: string
): Promise<string[] | null> => {
  const result = await findUserByEmailOrId({ userId, isDeleted: false });
  const user = result?.user;

  if (!user || !user.deviceTokens || user.deviceTokens.length === 0) {
    console.warn(`⚠️ No device tokens found for userId: ${userId}`);
    return null;
  }

  return user.deviceTokens;
};
