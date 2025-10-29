/* eslint-disable no-console */
import config from '../config';
import { USER_ROLE, USER_STATUS } from '../modules/User/user.constant';
import { User } from '../modules/User/user.model';

import { v4 as uuidv4 } from 'uuid';

export const seed = async () => {
  try {
    // at first check if the admin exist or not
    const admin = await User.findOne({
      role: USER_ROLE.ADMIN,
      email: config.admin_email,
      status: USER_STATUS.ACTIVE,
    });
    if (!admin) {
      console.log('Seeding started...');

      const id = uuidv4();

      await User.create({
        id,
        name: 'Admin',
        role: USER_ROLE.ADMIN,
        email: config.admin_email,
        password: config.admin_password,
        profilePhoto: config.admin_profile_photo,
        mobileNumber: config.admin_mobile_number,
        status: USER_STATUS.ACTIVE,
      });
      console.log('Admin created successfully...');
      console.log('Seeding completed...');
    }
  } catch (error) {
    console.log('Error in seeding', error);
  }
};
