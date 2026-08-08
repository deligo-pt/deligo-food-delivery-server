import { Job, Worker } from 'bullmq';
import { LoginHistory } from '../../modules/LoginHistory/loginHistory.model';
import { TDeviceType } from '../../modules/LoginHistory/loginHistory.interface';
import { queueConnection } from '../../config/bullmq';

// Clients send free-text deviceType (web/android/ios/...); LoginHistory only accepts this fixed enum.
const normalizeDeviceType = (deviceType?: string): TDeviceType => {
  switch ((deviceType || '').trim().toLowerCase()) {
    case 'android':
    case 'ios':
    case 'mobile':
      return 'MOBILE';
    case 'tablet':
    case 'ipad':
      return 'TABLET';
    case 'web':
    case 'desktop':
      return 'DESKTOP';
    default:
      return 'UNKNOWN';
  }
};

export const authWorker = new Worker(
  'auth-queue',
  async (job: Job) => {
    switch (job.name) {
      case 'CREATE_LOGIN_LOG':
        try {
          await LoginHistory.create({
            ...job.data,
            deviceType: normalizeDeviceType(job.data.deviceType),
          });
        } catch (error) {
          console.error(`[Auth Worker] Failed to save login history:`, error);
          throw error;
        }
        break;

      case 'UPDATE_LOGOUT_LOG':
        try {
          const loginHistory = await LoginHistory.findOne({
            sessionId: job.data.sessionId,
            userId: job.data.userId,
            logoutAt: { $exists: false },
          }).sort({ loginAt: -1 });

          if (!loginHistory) {
            console.warn(
              `[Auth Worker] No active login history found for session ${job.data.sessionId}.`,
            );
            break;
          }

          const logoutAt = new Date(job.data.logoutAt || new Date());
          const durationSec = Math.max(
            0,
            Math.floor(
              (logoutAt.getTime() - loginHistory.loginAt.getTime()) / 1000,
            ),
          );

          loginHistory.logoutAt = logoutAt;
          loginHistory.durationSec = durationSec;
          await loginHistory.save();
        } catch (error) {
          console.error(`[Auth Worker] Failed to update logout history:`, error);
          throw error;
        }
        break;

      default:
        console.warn(`[Auth Worker] Job name ${job.name} not handled.`);
    }
  },
  {
    connection: queueConnection,
    concurrency: 2,
  },
);
