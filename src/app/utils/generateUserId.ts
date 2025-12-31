import { USER_ROLE } from '../constant/user.constant';
import { customAlphabet } from 'nanoid';

const nanoid = customAlphabet('1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ', 8);
export const USER_TYPE_MAP = {
  '/create-customer': { prefix: 'C-', role: USER_ROLE.CUSTOMER },
  '/create-vendor': { prefix: 'V-', role: USER_ROLE.VENDOR },
  '/create-sub-vendor': { prefix: 'SV-', role: USER_ROLE.SUB_VENDOR },
  '/create-fleet-manager': { prefix: 'FM-', role: USER_ROLE.FLEET_MANAGER },
  '/create-delivery-partner': {
    prefix: 'D-',
    role: USER_ROLE.DELIVERY_PARTNER,
  },
  '/create-admin': { prefix: 'A-', role: USER_ROLE.ADMIN },
} as const;

const generateUserId = (userType: keyof typeof USER_TYPE_MAP): string => {
  const typeData = USER_TYPE_MAP[userType];
  const uniqueId = nanoid();
  return `${typeData.prefix}${uniqueId}`;
};

export default generateUserId;
