/* eslint-disable no-console */
import config from '../config';

import { v4 as uuidv4 } from 'uuid';
import { Admin } from '../modules/Admin/admin.model';
import { USER_ROLE, USER_STATUS } from '../constant/user.constant';
import { GlobalSettings } from '../modules/GlobalSetting/globalSetting.model';

export const seed = async () => {
  try {
    // at first check if the super admin exist or not
    const superAdmin = await Admin.findOne({
      role: USER_ROLE.SUPER_ADMIN,
      email: config.super_admin.super_admin_email,
      status: USER_STATUS.APPROVED,
    });
    if (!superAdmin) {
      const id = `SA-${uuidv4().split('-')[0]}`;

      await Admin.create({
        userId: id,
        name: 'Super Admin',
        role: USER_ROLE.SUPER_ADMIN,
        email: config.super_admin.super_admin_email,
        password: config.super_admin.super_admin_password,
        profilePhoto: config.super_admin.super_admin_profile_photo,
        contactNumber: config.super_admin.super_admin_contact_number,
        status: USER_STATUS.APPROVED,
        isEmailVerified: true,
      });
    }
    // --------------------------------------------------
    // Seed Global Settings
    // --------------------------------------------------
    const existingSettings = await GlobalSettings.findOne();

    if (!existingSettings) {
      console.log('Seeding global settings');

      await GlobalSettings.create({});
    }
  } catch (error) {
    console.error('Error in seeding', error);
  }
};
