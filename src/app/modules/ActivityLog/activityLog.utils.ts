import { AuthUser } from '../AuthUser/authUser.model';
import { TActivityLog } from './activityLog.interface';
import { ActivityLog } from './activityLog.model';

type TCreateLogPayload = {
  customUserId?: string;
  email?: string;
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
      const { customUserId, email, action, target, type } = payload;

      if (!customUserId && !email) return;

      const queryConditions: Record<string, unknown>[] = [];
      if (customUserId) queryConditions.push({ userId: customUserId });
      if (email) queryConditions.push({ email });

      const authUserProfile = await AuthUser.findOne({
        $or: queryConditions,
      }).populate<{ profileId: IProfile }>('profileId', 'name');

      if (!authUserProfile) {
        console.error(
          `Activity Log Warning: User not found for ID: ${customUserId || email}`,
        );
        return;
      }

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
