import { Types } from 'mongoose';

export const activityTypes = ['INFO', 'WARNING', 'DANGER'] as const;

export type ActivityType = (typeof activityTypes)[number];

export type TActivityLog = {
  authUserId: Types.ObjectId;
  userName: string;
  email: string;
  role: string;
  action: string;
  target?: string;
  type: ActivityType;
  createdAt: Date;
};
