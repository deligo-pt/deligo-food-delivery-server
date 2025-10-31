import { USER_ROLE, USER_STATUS } from '../modules/User/user.constant';

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  mobileNumber: string;
  role: keyof typeof USER_ROLE;
  status: keyof typeof USER_STATUS;
  iat: number;
  exp: number;
};
