/* eslint-disable @typescript-eslint/no-explicit-any */
import mongoose from 'mongoose';
import { RedisService } from '../config/redis';
import { ROLE_COLLECTION_MAP } from '../constant/user.constant';

export const initAuthEventListener = async () => {
  await RedisService.subscribe('USER_REGISTERED', async (payload: any) => {
    const role = payload.role;
    console.log({ role });
    const modelName =
      ROLE_COLLECTION_MAP[role as keyof typeof ROLE_COLLECTION_MAP];
    const model = mongoose.model(modelName);

    console.log({ model });

    try {
      await model.updateOne(
        { authUserId: payload.id },
        {
          $set: {
            authUserId: payload.id,
            customUserId: payload.userId,
            email: payload.email,
            role: payload.role,
          },
        },
        { upsert: true },
      );
    } catch (error) {
      console.error('Mongoose Sync Error:', error);
    }
  });
};
