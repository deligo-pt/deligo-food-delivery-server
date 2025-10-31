/* eslint-disable no-console */
import config from '../config';

import { v4 as uuidv4 } from 'uuid';
import { User } from '../modules/User/user.model';
import { USER_ROLE, USER_STATUS } from '../modules/User/user.constant';

export const seed = async () => {
  try {
    // at first check if the super admin exist or not
    const superAdmin = await User.findOne({
      role: USER_ROLE.SUPER_ADMIN,
      email: config.super_admin_email,
      status: USER_STATUS.ACTIVE,
    });
    if (!superAdmin) {
      console.log('Seeding started...');

      const id = `SA-${uuidv4().split('-')[0]}`;

      await User.create({
        id,
        name: 'Super Admin',
        role: USER_ROLE.SUPER_ADMIN,
        email: config.super_admin_email,
        password: config.super_admin_password,
        profilePhoto: config.super_admin_profile_photo,
        mobileNumber: config.super_admin_mobile_number,
        status: USER_STATUS.ACTIVE,
      });
      console.log('Super Admin created successfully...');
      console.log('Seeding completed...');
    }
  } catch (error) {
    console.log('Error in seeding', error);
  }
};
