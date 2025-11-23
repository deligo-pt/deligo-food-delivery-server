/* eslint-disable no-console */
import config from '../config';

import { v4 as uuidv4 } from 'uuid';
import { Admin } from '../modules/Admin/admin.model';
import { USER_ROLE, USER_STATUS } from '../constant/user.constant';
import { GlobalSettings } from '../modules/GlobalSetting/globalSetting.model';

export const seed = async () => {
  try {
    const globalSettings = await GlobalSettings.find();
    if (!globalSettings.length) {
      // global settings for the app
      await GlobalSettings.create({
        deliveryChargePerMeter: 0.05,
        baseDeliveryCharge: 0,
        minDeliveryCharge: 0,
        freeDeliveryAbove: 0,
      });
    }

    // at first check if the super admin exist or not
    const superAdmin = await Admin.findOne({
      role: USER_ROLE.SUPER_ADMIN,
      email: config.super_admin_email,
      status: USER_STATUS.APPROVED,
    });
    if (!superAdmin) {
      console.log('Seeding started...');

      const id = `SA-${uuidv4().split('-')[0]}`;

      await Admin.create({
        userId: id,
        name: 'Super Admin',
        role: USER_ROLE.SUPER_ADMIN,
        email: config.super_admin_email,
        password: config.super_admin_password,
        profilePhoto: config.super_admin_profile_photo,
        contactNumber: config.super_admin_contact_number,
        status: USER_STATUS.APPROVED,
        isEmailVerified: true,
      });

      console.log('Super Admin created successfully...');
      console.log('Seeding completed...');
    }
  } catch (error) {
    console.log('Error in seeding', error);
  }
};
