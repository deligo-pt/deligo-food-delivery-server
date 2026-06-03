/* eslint-disable no-console */
import config from '../config';

import { Admin } from '../modules/Admin/admin.model';
import {
  USER_ROLE,
  USER_STATUS,
} from '../constant/GlobalConstant/user.constant';
import { GlobalSettings } from '../modules/GlobalSetting/globalSetting.model';
import customNanoId from './customNanoId';
import { AuthUser } from '../modules/AuthUser/authUser.model';
import mongoose from 'mongoose';

export const seed = async () => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // --------------------------------------------------
    // Seed Super Admin
    // --------------------------------------------------
    const superAdmin = await AuthUser.findOne({
      role: USER_ROLE.SUPER_ADMIN,
      email: config.super_admin.super_admin_email,
    }).session(session);

    if (!superAdmin) {
      console.log('Seeding Super Admin and creating AuthUser shadow entry...');
      const userId = `SA-${customNanoId(8)}`;

      const [newAdminProfile] = await Admin.create(
        [
          {
            userId,
            name: 'Super Admin',
            profilePhoto: config.super_admin.super_admin_profile_photo,
            status: USER_STATUS.APPROVED,
            role: USER_ROLE.SUPER_ADMIN,
          },
        ],
        { session },
      );

      await AuthUser.create(
        [
          {
            userAuthId: `AUTH-${userId}`,
            userObjectId: newAdminProfile._id,
            onModel: 'Admin',
            userId,
            email: config.super_admin.super_admin_email,
            password: config.super_admin.super_admin_password,
            contactNumber: config.super_admin.super_admin_contact_number,
            role: USER_ROLE.SUPER_ADMIN,
            status: USER_STATUS.APPROVED,
            isEmailVerified: true,
            permissions: [],
            isDeleted: false,
          },
        ],
        { session },
      );
    }

    // --------------------------------------------------
    // Seed Global Settings
    // --------------------------------------------------
    const existingSettings = await GlobalSettings.findOne().session(session);

    if (!existingSettings) {
      console.log('Seeding global settings...');
      await GlobalSettings.create([{}], { session });
    }

    await session.commitTransaction();
    session.endSession();
    console.log('Seeding completed successfully!');
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('Error in seeding:', error);
  }
};
