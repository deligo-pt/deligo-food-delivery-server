/* eslint-disable no-console */
import config from '../config';
import bcryptjs from 'bcryptjs';

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

  try {
    session.startTransaction();

    const superAdminExists = await Admin.findOne({
      role: USER_ROLE.SUPER_ADMIN,
    }).session(session);

    if (!superAdminExists) {
      const customUserId = `SA-${customNanoId(8)}`;

      const [newAdminProfile] = await Admin.create(
        [
          {
            userId: customUserId,
            name: {
              firstName: 'Super',
              lastName: 'Admin',
            },
            email: config.super_admin.super_admin_email,
            contactNumber: config.super_admin.super_admin_contact_number,
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
            userId: customUserId,
            profileId: newAdminProfile._id,
            profileModel: 'Admin',
            email: config.super_admin.super_admin_email,
            password: config.super_admin.super_admin_password,
            contactNumber: config.super_admin.super_admin_contact_number,
            role: USER_ROLE.SUPER_ADMIN,
            status: USER_STATUS.APPROVED,
            isEmailVerified: true,
            isContactNumberVerified: true,
            isDeleted: false,
          },
        ],
        { session },
      );

      if (config.NODE_ENV === 'development') {
        console.log('Super Admin seeded successfully.');
      }
    } else {
      const authUser = await AuthUser.findOne({
        role: USER_ROLE.SUPER_ADMIN,
      }).session(session);

      if (authUser) {
        let isAuthUserUpdated = false;
        let isAdminProfileUpdated = false;

        if (
          config.super_admin.super_admin_email &&
          authUser.email !== config.super_admin.super_admin_email
        ) {
          authUser.email = config.super_admin.super_admin_email;
          superAdminExists.email = config.super_admin.super_admin_email;
          isAuthUserUpdated = true;
          isAdminProfileUpdated = true;
        }

        if (
          config.super_admin.super_admin_contact_number &&
          authUser.contactNumber !==
            config.super_admin.super_admin_contact_number
        ) {
          authUser.contactNumber =
            config.super_admin.super_admin_contact_number;
          superAdminExists.contactNumber =
            config.super_admin.super_admin_contact_number;
          isAuthUserUpdated = true;
          isAdminProfileUpdated = true;
        }

        if (config.super_admin.super_admin_password && authUser.password) {
          const isPasswordMatched = await bcryptjs.compare(
            config.super_admin.super_admin_password,
            authUser.password,
          );

          if (!isPasswordMatched) {
            authUser.password = config.super_admin.super_admin_password;
            isAuthUserUpdated = true;
          }
        }

        if (isAuthUserUpdated) {
          await authUser.save({ session });
        }

        if (isAdminProfileUpdated) {
          await superAdminExists.save({ session });
        }

        if (isAuthUserUpdated || isAdminProfileUpdated) {
          console.log('Super Admin credentials updated from .env environment.');
        }
      }
    }

    const existingSettings = await GlobalSettings.findOne().session(session);

    if (!existingSettings) {
      console.log('Seeding global settings...');
      await GlobalSettings.create([{}], { session });
      console.log('Global settings seeded successfully.');
    }

    await session.commitTransaction();
  } catch (error) {
    await session.abortTransaction();
    console.error('Error in seeding process:', error);
  } finally {
    await session.endSession();
  }
};
