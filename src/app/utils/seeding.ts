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
    const superAdmin = await Admin.findOne({
      role: USER_ROLE.SUPER_ADMIN,
      email: config.super_admin.super_admin_email,
    }).session(session);

    if (!superAdmin) {
      console.log('Seeding Super Admin and creating AuthUser shadow entry...');
      const customId = `SA-${customNanoId(8)}`;

      const [newAdminProfile] = await Admin.create(
        [
          {
            userId: customId,
            name: 'Super Admin',
            role: USER_ROLE.SUPER_ADMIN,
            email: config.super_admin.super_admin_email,
            password: config.super_admin.super_admin_password,
            profilePhoto: config.super_admin.super_admin_profile_photo,
            contactNumber: config.super_admin.super_admin_contact_number,
            status: USER_STATUS.APPROVED,
            isEmailVerified: true,
          },
        ],
        { session },
      );

      await AuthUser.create(
        [
          {
            authUserId: `AUTH-${customId}`,
            userObjectId: newAdminProfile._id,
            customUserId: customId,
            email: config.super_admin.super_admin_email,
            role: USER_ROLE.SUPER_ADMIN,
            status: USER_STATUS.APPROVED,
            permissions: [],
            isDeleted: false,
          },
        ],
        { session },
      );
    }

    // --------------------------------------------------
    // Seed Agent
    // --------------------------------------------------
    const agent = await Admin.findOne({
      role: USER_ROLE.AGENT,
      email: config.agent.email,
    }).session(session);

    if (!agent) {
      console.log('Seeding Agent and creating AuthUser shadow entry...');
      await Admin.deleteMany({ role: USER_ROLE.AGENT }).session(session);
      await AuthUser.deleteMany({
        role: USER_ROLE.AGENT,
        email: config.agent.email,
      }).session(session);

      const customId = `AG-${customNanoId(8)}`;

      const [newAgentProfile] = await Admin.create(
        [
          {
            userId: customId,
            name: 'Agent',
            role: USER_ROLE.AGENT,
            email: config.agent.email,
            password: config.agent.password,
            profilePhoto: config.agent.profile_photo,
            contactNumber: config.agent.contact_number,
            status: USER_STATUS.APPROVED,
            isEmailVerified: true,
          },
        ],
        { session },
      );

      await AuthUser.create(
        [
          {
            authUserId: `AUTH-${customId}`,
            userObjectId: newAgentProfile._id,
            customUserId: customId,
            email: config.agent.email,
            role: USER_ROLE.AGENT,
            status: 'ACTIVE',
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
