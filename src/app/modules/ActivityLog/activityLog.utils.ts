import { AuthUser } from '../AuthUser/authUser.model';
import { TActivityLog } from './activityLog.interface';
import { ActivityLog } from './activityLog.model';

type TCreateLogPayload = {
  customUserId: string;
  action: string;
  target?: string;
  type?: TActivityLog['type'];
};

interface IProfile {
  name?: {
    firstName?: string;
    lastName?: string;
  };
}

export const createActivityLog = (payload: TCreateLogPayload) => {
  (async () => {
    try {
      const { customUserId, action, target, type } = payload;

      const authUserProfile = await AuthUser.findOne({
        userId: customUserId,
      }).populate<{ profileId: IProfile }>('profileId', 'name');

      if (!authUserProfile) return;

      const profile = authUserProfile.profileId;
      const firstName = profile?.name?.firstName || '';
      const lastName = profile?.name?.lastName || '';
      const fullName = `${firstName} ${lastName}`.trim();
      const userName = fullName.length > 0 ? fullName : 'Unknown User';

      await ActivityLog.create({
        authUserId: authUserProfile._id,
        userName,
        email: authUserProfile.email,
        role: authUserProfile.role,
        action,
        target: target || '',
        type: type || 'INFO',
      });
    } catch (error) {
      console.error('Background Activity Log Error:', error);
    }
  })();
};
