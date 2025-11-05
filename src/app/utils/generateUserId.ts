import { v4 as uuidv4 } from 'uuid';
import { USER_ROLE } from '../constant/user.const';

export const USER_TYPE_MAP = {
  '/create-customer': { prefix: 'C-', role: USER_ROLE.CUSTOMER },
  '/create-vendor': { prefix: 'V-', role: USER_ROLE.VENDOR },
  '/create-fleet-manager': { prefix: 'FM-', role: USER_ROLE.FLEET_MANAGER },
  '/create-delivery-partner': {
    prefix: 'D-',
    role: USER_ROLE.DELIVERY_PARTNER,
  },
  '/create-admin': { prefix: 'A-', role: USER_ROLE.ADMIN },
} as const;

const generateUserId = (userType: keyof typeof USER_TYPE_MAP): string => {
  const typeData = USER_TYPE_MAP[userType];
  const uniqueId = uuidv4().split('-')[0];
  return `${typeData.prefix}${uniqueId}`;
};

export default generateUserId;
