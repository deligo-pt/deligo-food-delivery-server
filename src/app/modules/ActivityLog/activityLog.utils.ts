import { Schema } from 'mongoose';
import { TActivityLog } from './activityLog.interface';
import { ActivityLog } from './activityLog.model';

type TCreateLogPayload = {
  userObjectId: string | Schema.Types.ObjectId;
  userName: string;
  email: string;
  role: string;
  action: string;
  target?: string;
  type?: TActivityLog['type'];
};

export const createActivityLog = async (payload: TCreateLogPayload) => {
  try {
    await ActivityLog.create(payload);
  } catch (error) {
    console.error('Activity Log Error:', error);
  }
};
