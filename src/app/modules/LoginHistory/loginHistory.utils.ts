import { Types } from 'mongoose';
import { TUserRole } from '../../constant/GlobalConstant/user.constant';
import { TLoginDevice } from '../../constant/GlobalInterface/user.interface';
import { LoginHistory } from './loginHistory.model';
import { TFailureReason } from './loginHistory.interface';

export const createLoginLog = async (
  email: string,
  role: TUserRole,
  deviceDetails: TLoginDevice,
  status: 'success' | 'failed',
  userId?: Types.ObjectId,
  failureReason?: TFailureReason,
  sessionId?: string,
) => {
  try {
    await LoginHistory.create({
      userId: userId || null,
      email: email,
      userRole: role,
      ipAddress: deviceDetails?.ip || 'unknown',
      city: 'Unknown',
      country: 'Unknown',
      deviceType: deviceDetails?.deviceType || 'UNKNOWN',
      browser: deviceDetails?.deviceName || 'unknown',
      os: deviceDetails?.userAgent ? 'Detected from UA' : 'unknown',
      userAgent: deviceDetails?.userAgent || 'unknown',
      status: status,
      failureReason: failureReason,
      sessionId: sessionId || deviceDetails?.deviceId,
      loginAt: new Date(),
    });
  } catch (error) {
    console.error('Failed to create login log:', error);
  }
};
