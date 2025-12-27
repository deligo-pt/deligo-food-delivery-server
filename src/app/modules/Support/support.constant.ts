import { TUserRole } from '../../constant/user.constant';

export type TConversationParticipant = {
  userId: string;
  role: TUserRole;
  name?: string;
};
