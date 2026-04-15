// /* eslint-disable @typescript-eslint/no-explicit-any */
// import { RedisService } from '../config/redis';

// export const initAuthEventListener = async () => {
//   await RedisService.subscribe('USER_REGISTERED', async (payload: any) => {
//     try {
//       await User.updateOne(
//         { authUserId: payload.id },
//         {
//           $set: {
//             authUserId: payload.id,
//             customUserId: payload.userId,
//             email: payload.email,
//             role: payload.role,
//           },
//         },
//         { upsert: true },
//       );
//     } catch (error) {
//       console.error('Mongoose Sync Error:', error);
//     }
//   });
// };
