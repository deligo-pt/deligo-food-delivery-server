import { TUserRole, USER_ROLE } from '../constant/GlobalConstant/user.constant';
import customNanoId from './customNanoId';

export const USER_TYPE_MAP = {
  CUSTOMER: { prefix: 'C-', role: USER_ROLE.CUSTOMER },
  VENDOR: { prefix: 'V-', role: USER_ROLE.VENDOR },
  SUB_VENDOR: { prefix: 'SV-', role: USER_ROLE.SUB_VENDOR },
  FLEET_MANAGER: { prefix: 'FM-', role: USER_ROLE.FLEET_MANAGER },
  DELIVERY_PARTNER: {
    prefix: 'D-',
    role: USER_ROLE.DELIVERY_PARTNER,
  },
  ADMIN: { prefix: 'A-', role: USER_ROLE.ADMIN },
  SUPER_ADMIN: { prefix: 'SA-', role: USER_ROLE.SUPER_ADMIN },
} as const;

const generateUserId = (role: TUserRole): string => {
  const typeData = USER_TYPE_MAP[role];
  const uniqueId = customNanoId(8);
  return `${typeData.prefix}${uniqueId}`;
};

export default generateUserId;
