/* eslint-disable @typescript-eslint/no-explicit-any */
import httpStatus from 'http-status';
import AppError from '../../errors/AppError';
import generateUserId from '../../utils/generateUserId';
import generateOtp from '../../utils/generateOtp';
import { Model } from 'mongoose';
import bcryptjs from 'bcryptjs';
import {
  ROLE_ONBOARD_PERMISSIONS,
  TApprovedRejectsPayload,
} from './auth.constant';
import {
  ROLE_COLLECTION_MAP,
  ROLE_DEVICE_LIMITS,
  TUserRole,
  USER_ROLE,
  USER_STATUS,
} from '../../constant/GlobalConstant/user.constant';
import { EmailHelper } from '../../utils/emailSender';
import { createToken, verifyToken } from '../../utils/verifyJWT';
import { TLoginCustomer, TLoginUser, TRegisterUser } from './auth.interface';
import { findUserById } from '../../utils/findUserByEmailOrId';
import { JwtPayload } from 'jsonwebtoken';
import crypto from 'crypto';
import config from '../../config';
import { Customer } from '../Customer/customer.model';
import { sendMobileOtp } from '../../utils/sendMobileOtp';
import { verifyMobileOtp } from '../../utils/verifyMobileOtp';
import { resendMobileOtp } from '../../utils/resendMobileOtp';
import { NotificationService } from '../Notification/notification.service';
import mongoose from 'mongoose';
import { RedisService } from '../../config/redis';
import { ReferralServices } from '../Referral/referral.service';
import {
  TCurrentUser,
  TLoginDevice,
} from '../../constant/GlobalInterface/user.interface';
import { AuthUser } from '../AuthUser/authUser.model';

// Register User [Vendor, Fleet Manager, Admin]
const registerUser = async (payload: TRegisterUser) => {
  const { email, role, password } = payload;
  const currentRegisteringRole = role as TUserRole;
  const modelData = ROLE_COLLECTION_MAP[currentRegisteringRole];
  if (!modelData) {
    throw new AppError(httpStatus.BAD_REQUEST, 'INVALID_REG_PATH');
  }

  const mongooseModel = mongoose.model(modelData);
  const userId = generateUserId(currentRegisteringRole);
  const { otp } = generateOtp();
  const formattedEmail = email.trim().toLowerCase();

  const existingUsersAnywhere = await AuthUser.find({
    email: formattedEmail,
  }).select('email role status profileId _id isEmailVerified');

  if (existingUsersAnywhere.length > 0) {
    const verifiedMainUser = existingUsersAnywhere.find(
      (u) => u.role !== 'CUSTOMER' && u.isEmailVerified === true,
    );

    if (verifiedMainUser) {
      throw new AppError(httpStatus.FORBIDDEN, 'EMAIL_ALREADY_REGISTERED', {
        role: verifiedMainUser.role as string,
        targetRole: currentRegisteringRole as string,
      });
    }

    const sameRoleVerifiedUser = existingUsersAnywhere.find(
      (u) => u.role === currentRegisteringRole && u.isEmailVerified === true,
    );

    if (sameRoleVerifiedUser) {
      throw new AppError(httpStatus.CONFLICT, 'EMAIL_ALREADY_VERIFIED', {
        formattedEmail,
        role: currentRegisteringRole as string,
      });
    }
  }

  const emailHtml = await EmailHelper.createEmailContent(
    {
      otp,
      userEmail: formattedEmail,
      currentYear: new Date().getFullYear(),
      date: new Date().toDateString(),
      user: currentRegisteringRole.toLowerCase(),
    },
    'verify-email',
  );

  const session = await mongoose.startSession();
  session.startTransaction();

  let createdUser: any = null;
  try {
    const unverifiedMainUser = existingUsersAnywhere.find(
      (u) => u.role !== 'CUSTOMER' && u.isEmailVerified === false,
    );

    if (unverifiedMainUser) {
      const prevModelData =
        ROLE_COLLECTION_MAP[unverifiedMainUser.role as TUserRole];
      if (prevModelData) {
        const prevModel = mongoose.model(prevModelData);
        await prevModel.deleteOne(
          { _id: unverifiedMainUser.profileId },
          { session },
        );
      }
      await AuthUser.deleteOne({ _id: unverifiedMainUser._id }, { session });
    }

    const result = await mongooseModel.create(
      [{ email: formattedEmail, userId, role: currentRegisteringRole }],
      { session },
    );
    createdUser = result[0];

    await AuthUser.create(
      [
        {
          userId,
          profileId: createdUser._id,
          profileModel: modelData,
          email: formattedEmail,
          password,
          role: currentRegisteringRole,
          status: 'PENDING',
          isDeleted: false,
        },
      ],
      { session },
    );

    const redisOtpKey = `otp:${currentRegisteringRole.toLowerCase()}:${formattedEmail}`;
    await RedisService.set(redisOtpKey, otp, 300);

    await session.commitTransaction();
    session.endSession();
  } catch (err: any) {
    await session.abortTransaction();
    session.endSession();
    console.error('Registration Transaction Failed:', err);
    if (err?.code === 11000) {
      throw new AppError(httpStatus.CONFLICT, 'EMAIL_CONFLICT_ROLE');
    }
    throw err;
  }

  EmailHelper.sendEmail(
    formattedEmail,
    emailHtml,
    'Verify your email for DeliGo',
  ).catch((err) => console.error('Email sending failed:', err));

  return {
    messageKey: 'REGISTRATION_SUCCESS' as const,
    variables: { role: currentRegisteringRole as string },
    data: {
      userId,
      email: formattedEmail,
      role: currentRegisteringRole,
      status: 'PENDING',
    },
  };
};

const onboardUser = async (
  payload: TRegisterUser,
  currentUser: TCurrentUser,
) => {
  const { email, role, password } = payload;
  const currentOnboardingRole = role as TUserRole;
  const modelData = ROLE_COLLECTION_MAP[currentOnboardingRole];

  if (!modelData) {
    throw new AppError(httpStatus.BAD_REQUEST, 'INVALID_ONBOARDING_ROLE');
  }

  if (currentUser.status !== 'APPROVED') {
    throw new AppError(httpStatus.FORBIDDEN, 'ONBOARD_UNAPPROVED_USER', {
      status: currentUser.status,
    });
  }

  const allowedRoles =
    ROLE_ONBOARD_PERMISSIONS[currentOnboardingRole.toLowerCase()];

  if (allowedRoles && !allowedRoles.includes(currentUser.role)) {
    throw new AppError(httpStatus.FORBIDDEN, 'ONBOARD_PERMISSION_DENIED', {
      role: currentOnboardingRole.replace('-', ' '),
    });
  }

  const mongooseModel = mongoose.model(modelData);

  const userId = generateUserId(currentOnboardingRole);
  const { otp } = generateOtp();

  const formattedEmail = email.trim().toLowerCase();

  const existingUsersAnywhere = await AuthUser.find({
    email: formattedEmail,
  }).select('email role status profileId _id isEmailVerified userId');

  if (existingUsersAnywhere.length > 0) {
    const verifiedMainUser = existingUsersAnywhere.find(
      (u) => u.role !== 'CUSTOMER' && u.isEmailVerified === true,
    );

    if (verifiedMainUser) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        'EMAIL_ALREADY_REGISTERED_ONBOARD',
        {
          role: verifiedMainUser.role as string,
          currentOnboardingRole: currentOnboardingRole as string,
        },
      );
    }

    const sameRoleVerifiedUser = existingUsersAnywhere.find(
      (u) => u.role === currentOnboardingRole && u.isEmailVerified === true,
    );

    if (sameRoleVerifiedUser) {
      throw new AppError(httpStatus.CONFLICT, 'EMAIL_ALREADY_VERIFIED', {
        formattedEmail,
        role: currentOnboardingRole as string,
      });
    }
  }

  let registeredByValue: any;
  if (
    ['VENDOR', 'SUB_VENDOR', 'DELIVERY_PARTNER'].includes(currentOnboardingRole)
  ) {
    registeredByValue = {
      id: currentUser._id,
      model:
        currentUser.role === 'FLEET_MANAGER'
          ? 'FleetManager'
          : currentUser.role === 'VENDOR'
            ? 'Vendor'
            : 'Admin',
    };
  } else {
    registeredByValue = currentUser._id;
  }

  const session = await mongoose.startSession();
  let createdUser;

  try {
    session.startTransaction();

    const unverifiedMainUser = existingUsersAnywhere.find(
      (u) => u.role !== 'CUSTOMER' && u.isEmailVerified === false,
    );

    if (unverifiedMainUser) {
      const prevModelData =
        ROLE_COLLECTION_MAP[unverifiedMainUser.role as TUserRole];
      if (prevModelData) {
        const prevModel = mongoose.model(prevModelData);
        await prevModel.deleteOne(
          { _id: unverifiedMainUser.profileId },
          { session },
        );
      }
      await AuthUser.deleteOne({ _id: unverifiedMainUser._id }, { session });
    }

    await mongooseModel.deleteOne({ email: formattedEmail }, { session });

    const result = await mongooseModel.create(
      [
        {
          email: formattedEmail,
          userId,
          registeredBy: registeredByValue,
          status: 'PENDING',
          role: currentOnboardingRole,
        },
      ],
      { session },
    );
    createdUser = result[0];

    await AuthUser.create(
      [
        {
          userId,
          profileId: createdUser._id,
          profileModel: modelData,
          email: formattedEmail,
          password,
          role: currentOnboardingRole,
          status: 'PENDING',
          isDeleted: false,
        },
      ],
      { session },
    );

    await session.commitTransaction();
  } catch (err: any) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    console.error('Onboarding Transaction Failed:', err);

    if (err?.code === 11000) {
      throw new AppError(httpStatus.CONFLICT, 'EMAIL_CONFLICT_ONBOARD_ID');
    }
    throw err;
  } finally {
    await session.endSession();
  }

  const redisOtpKey = `otp:${currentOnboardingRole.toLowerCase()}:${formattedEmail}`;
  await RedisService.set(redisOtpKey, otp, 300);

  const emailHtml = await EmailHelper.createEmailContent(
    {
      otp,
      userEmail: formattedEmail,
      currentYear: new Date().getFullYear(),
      date: new Date().toDateString(),
      user: currentOnboardingRole.toLowerCase(),
    },
    'verify-email',
  );

  EmailHelper.sendEmail(
    formattedEmail,
    emailHtml,
    'Verify your email for DeliGo',
  ).catch((err) => console.error('Email sending failed:', err));

  return {
    messageKey: 'ONBOARD_SUCCESS' as const,
    variables: {
      role: currentOnboardingRole as string,
      email: formattedEmail,
    },
    data: {
      userId,
      email: formattedEmail,
      role: currentOnboardingRole,
      status: 'PENDING',
    },
  };
};

// Verify OTP
const verifyOtp = async (payload: {
  role: TUserRole;
  email?: string;
  contactNumber?: string;
  otp?: string;
  deviceDetails?: TLoginDevice;
  forceLogin?: boolean;
}) => {
  const { role, email, contactNumber, otp, deviceDetails, forceLogin } =
    payload;
  if (!email && !contactNumber) {
    throw new AppError(httpStatus.BAD_REQUEST, 'CREDENTIAL_REQUIRED');
  }

  let userData: any = undefined;

  if (email) {
    userData = await AuthUser.findOne({
      email,
      role,
      isDeleted: false,
    });
  } else if (contactNumber) {
    userData = await AuthUser.findOne({
      contactNumber,
      role,
      isDeleted: false,
    }).lean();
  }

  if (!userData) {
    throw new AppError(httpStatus.NOT_FOUND, 'USER_NOT_FOUND_REGISTER');
  }

  const deviceLimit = ROLE_DEVICE_LIMITS[userData.role] || 3;
  const currentDeviceId = deviceDetails?.deviceId || 'unknown';

  const loginDevices = userData.loginDevices || [];

  const existingDeviceIndex = loginDevices?.findIndex(
    (d: TLoginDevice) => d.deviceId === currentDeviceId,
  );
  const isExisting =
    existingDeviceIndex !== undefined && existingDeviceIndex > -1;

  if (!isExisting && (loginDevices?.length || 0) >= deviceLimit) {
    if (!forceLogin) {
      throw new AppError(httpStatus.FORBIDDEN, 'LIMIT_EXCEEDED');
    }
  }

  if (email) {
    const redisOtpKey = `otp:${role.toLowerCase()}:${email}`;
    const storedOtp = await RedisService.get(redisOtpKey);

    if (email === config.customer.test_customer_email) {
      if (otp !== config.customer.test_customer_otp) {
        throw new AppError(httpStatus.UNAUTHORIZED, 'INVALID_OTP');
      }
    } else if (!storedOtp || String(storedOtp) !== String(otp)) {
      throw new AppError(httpStatus.UNAUTHORIZED, 'INVALID_OR_EXPIRED_OTP');
    }

    await RedisService.del(redisOtpKey);
  } else if (contactNumber) {
    if (contactNumber === config.customer.test_customer_contact_number) {
      if (otp !== config.customer.test_customer_contact_otp) {
        throw new AppError(httpStatus.UNAUTHORIZED, 'INVALID_OTP');
      }
    } else {
      const res = await verifyMobileOtp(
        userData.mobileOtpId as string,
        otp as string,
      );

      if (!res?.data?.verified) {
        throw new AppError(httpStatus.UNAUTHORIZED, 'INVALID_OR_EXPIRED_OTP');
      }
    }
  }

  const newDevice: TLoginDevice = {
    deviceId: deviceDetails?.deviceId || 'unknown',
    deviceType: deviceDetails?.deviceType || 'unknown',
    deviceName: deviceDetails?.deviceName || '',
    fcmToken: deviceDetails?.fcmToken || '',
    userAgent: deviceDetails?.userAgent || '',
    ip: deviceDetails?.ip || '',
    isVerified: true,
    isLoggedIn: true,
    lastLogin: new Date(),
  };

  const updateQuery: any = {
    $set: { requiresOtpVerification: false },
  };

  const options: any = { new: true };

  if (email) {
    updateQuery.$set.isEmailVerified = true;
  } else if (contactNumber) {
    updateQuery.$set.isContactNumberVerified = true;
  }

  if (isExisting) {
    updateQuery.$set['loginDevices.$[elem]'] = newDevice;
    options.arrayFilters = [{ 'elem.deviceId': newDevice.deviceId }];
  } else {
    if ((loginDevices?.length || 0) >= deviceLimit) {
      if (!forceLogin)
        throw new AppError(httpStatus.FORBIDDEN, 'LIMIT_EXCEEDED');

      updateQuery.$push = {
        loginDevices: {
          $each: [newDevice],
          $slice: -deviceLimit,
        },
      };
    } else {
      updateQuery.$push = { loginDevices: newDevice };
    }
  }

  await AuthUser.findOneAndUpdate({ _id: userData._id }, updateQuery, options);

  const populatedAuthUser = await AuthUser.findById(userData._id).populate(
    'profileId',
    'name',
  );

  const profileDetails = populatedAuthUser?.profileId as any;

  const jwtPayload = {
    userId: userData?.userId,
    name: {
      firstName: profileDetails?.name?.firstName || '',
      lastName: profileDetails?.name?.lastName || '',
    },
    email: userData?.email || '',
    contactNumber: userData?.contactNumber || '',
    role: userData?.role,
    status: userData?.status,
    deviceId: newDevice.deviceId,
  };

  const accessToken = createToken(
    jwtPayload,
    config.jwt.jwt_access_secret as string,
    config.jwt.jwt_access_expires_in as string,
  );
  const refreshToken = createToken(
    jwtPayload,
    config.jwt.jwt_refresh_secret as string,
    config.jwt.jwt_refresh_expires_in as string,
  );

  return {
    messageKey: email
      ? ('VERIFY_EMAIL_SUCCESS' as const)
      : ('VERIFY_CONTACT_SUCCESS' as const),
    variables: email ? { role: userData.role as string } : undefined,
    accessToken,
    refreshToken,
  };
};

// Resend OTP
const resendOtp = async (payload: {
  role: TUserRole;
  email?: string;
  contactNumber?: string;
}) => {
  const { role, email, contactNumber } = payload;
  if (!email?.trim() && !contactNumber?.trim()) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'RESEND_OTP_CREDENTIAL_REQUIRED',
    );
  }

  let successMessageKey:
    | 'RESEND_OTP_EMAIL_SUCCESS'
    | 'RESEND_OTP_MOBILE_SUCCESS' = 'RESEND_OTP_EMAIL_SUCCESS';

  if (contactNumber) {
    const user = await AuthUser.findOne({
      role: 'CUSTOMER',
      contactNumber: contactNumber.trim(),
      isDeleted: false,
    });

    if (!user) {
      throw new AppError(httpStatus.NOT_FOUND, 'USER_NOT_FOUND_CONTACT');
    }

    const id = user.mobileOtpId;
    if (!id) {
      throw new AppError(httpStatus.BAD_REQUEST, 'NO_ACTIVE_OTP_SESSION');
    }

    await resendMobileOtp(id as string);

    user.requiresOtpVerification = true;
    await user.save();

    successMessageKey = 'RESEND_OTP_MOBILE_SUCCESS';
  }

  if (email) {
    const formattedEmail = email.trim().toLowerCase();
    const user = await AuthUser.findOne({
      role: role,
      email: email.trim().toLowerCase(),
      isDeleted: false,
    }).populate('profileId', 'userId name');

    if (!user) {
      throw new AppError(httpStatus.NOT_FOUND, 'USER_NOT_FOUND_EMAIL');
    }

    if (user.isEmailVerified) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'EMAIL_ALREADY_VERIFIED_LOGIN',
      );
    }

    const { otp } = generateOtp();
    const redisOtpKey = `otp:${role.toLowerCase()}:${formattedEmail}`;
    await RedisService.set(redisOtpKey, otp, 300); // 5-minute TTL

    user.requiresOtpVerification = true;
    await user.save();

    const loggedInUser = user.profileId as any;
    const userName = loggedInUser?.name?.firstName || 'Customer';
    const actionDate = new Date();

    (async () => {
      try {
        const emailHtml = await EmailHelper.createEmailContent(
          {
            otp,
            userEmail: user.email,
            currentYear: actionDate.getFullYear(),
            date: actionDate.toDateString(),
            user: userName,
          },
          'verify-email',
        );

        await EmailHelper.sendEmail(
          user.email,
          emailHtml,
          'Verify your email for DeliGo',
        );
      } catch (err: any) {
        console.error(
          'Safe Background Guard -> Resend OTP Email Failed:',
          err.message,
        );
      }
    })();

    successMessageKey = 'RESEND_OTP_EMAIL_SUCCESS';
  }

  return {
    success: true,
    messageKey: successMessageKey,
  };
};

// Login User
const loginUser = async (
  payload: TLoginUser & { deviceDetails: TLoginDevice; forceLogin?: boolean },
) => {
  // checking if the user is exist
  const user = await AuthUser.findOne({
    email: payload?.email,
    role: { $ne: 'CUSTOMER' },
  });
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'USER_NOT_FOUND');
  }

  if (user?.isDeleted) {
    throw new AppError(httpStatus.NOT_FOUND, 'ACCOUNT_DELETED');
  }

  // checking if the user is blocked
  const userStatus = user?.status;

  if (userStatus === USER_STATUS.BLOCKED) {
    throw new AppError(httpStatus.FORBIDDEN, 'USER_BLOCKED');
  }

  if (!user?.isEmailVerified) {
    throw new AppError(httpStatus.FORBIDDEN, 'USER_NOT_VERIFIED');
  }

  if (!payload.password) {
    throw new AppError(httpStatus.BAD_REQUEST, 'PASSWORD_MISSING');
  }

  //checking if the password is correct
  const isPasswordMatched = await AuthUser.isPasswordMatched(
    payload.password,
    user.password as string,
  );

  if (!isPasswordMatched) {
    throw new AppError(httpStatus.UNAUTHORIZED, 'PASSWORD_NOT_MATCHED');
  }

  const deviceLimit = ROLE_DEVICE_LIMITS[user.role] || 3;
  const { deviceId, fcmToken, deviceType, deviceName, userAgent, ip } =
    payload.deviceDetails;

  const newDevice: TLoginDevice = {
    deviceId: deviceId || 'unknown',
    deviceType: deviceType || 'unknown',
    deviceName: deviceName || '',
    fcmToken: fcmToken || '',
    userAgent: userAgent || '',
    ip: ip || '',
    isVerified: true,
    isLoggedIn: true,
    lastLogin: new Date(),
  };

  const loginDevices = user.loginDevices || [];

  const existingDeviceIndex = loginDevices.findIndex(
    (device: TLoginDevice) => device.deviceId === newDevice.deviceId,
  );

  const isExisting =
    existingDeviceIndex !== undefined && existingDeviceIndex > -1;
  let updateQuery: any;
  const options: any = { new: true };

  if (isExisting) {
    updateQuery = {
      $set: { ['loginDevices.$[elem]']: newDevice },
    };
    options.arrayFilters = [{ 'elem.deviceId': newDevice.deviceId }];
  } else {
    if (user.loginDevices?.length >= deviceLimit) {
      if (!payload.forceLogin) {
        throw new AppError(httpStatus.FORBIDDEN, 'LIMIT_EXCEEDED');
      }

      updateQuery = {
        $push: {
          loginDevices: {
            $each: [newDevice],
            $slice: -deviceLimit,
          },
        },
      };
    } else {
      updateQuery = {
        $push: { loginDevices: newDevice },
      };
    }
  }

  await AuthUser.findOneAndUpdate({ _id: user._id }, updateQuery, options);

  const { user: userProfile } = await findUserById({ userId: user?.userId });

  //create token and sent to the  client
  const jwtPayload = {
    userId: user?.userId,
    name: {
      firstName: userProfile?.name?.firstName,
      lastName: userProfile?.name?.lastName,
    },
    email: user?.email,
    contactNumber: user?.contactNumber,
    role: user?.role,
    status: user?.status,
    deviceId: newDevice.deviceId,
  };

  const accessToken = createToken(
    jwtPayload,
    config.jwt.jwt_access_secret as string,
    config.jwt.jwt_access_expires_in as string,
  );

  const refreshToken = createToken(
    jwtPayload,
    config.jwt.jwt_refresh_secret as string,
    config.jwt.jwt_refresh_expires_in as string,
  );

  return {
    accessToken,
    refreshToken,
    messageKey: 'LOGIN_SUCCESS' as const,
    variables: { role: user?.role as string },
  };
};

// login customer
const loginCustomer = async (payload: TLoginCustomer) => {
  const { email, contactNumber, referralCode } = payload;

  if (!email && !contactNumber) {
    throw new AppError(httpStatus.BAD_REQUEST, 'LOGIN_CREDENTIAL_REQUIRED');
  }

  const handleReferral = async (
    user: any,
    code: string,
    session: mongoose.ClientSession,
  ) => {
    const res = await ReferralServices.createReferralEntry(user, code, session);
    if (res?.referrerId) {
      await Customer.findByIdAndUpdate(
        user._id,
        { referredBy: res.referrerId },
        { session },
      );
    }
  };

  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    if (email) {
      const formattedEmail = email.trim().toLowerCase();

      const existingCustomer = await Customer.findOne({
        email: formattedEmail,
      }).session(session);

      if (existingCustomer?.referredBy && referralCode) {
        throw new AppError(httpStatus.BAD_REQUEST, 'ALREADY_REFERRED');
      }

      const { otp } = generateOtp();
      const redisOtpKey = `otp:${USER_ROLE.CUSTOMER.toLowerCase()}:${formattedEmail}`;
      await RedisService.set(redisOtpKey, otp, 300);

      if (!existingCustomer) {
        const userId = generateUserId('CUSTOMER');

        const newUsers = await Customer.create(
          [
            {
              userId,
              email: formattedEmail,
            },
          ],
          { session },
        );
        const newUser = newUsers[0];

        await AuthUser.create(
          [
            {
              userId,
              profileId: newUser._id,
              profileModel: 'Customer',
              email: formattedEmail,
              role: USER_ROLE.CUSTOMER,
              requiresOtpVerification: true,
            },
          ],
          { session },
        );

        if (referralCode) {
          await handleReferral(newUser, referralCode, session);
        }
      } else {
        if (!existingCustomer.referredBy && referralCode) {
          await handleReferral(existingCustomer, referralCode, session);
        }

        await AuthUser.updateOne(
          { profileId: existingCustomer._id, role: USER_ROLE.CUSTOMER },
          { requiresOtpVerification: true },
          { session },
        );
      }

      const emailHtml = await EmailHelper.createEmailContent(
        {
          otp,
          userEmail: formattedEmail,
          currentYear: new Date().getFullYear(),
          date: new Date().toDateString(),
          user: existingCustomer?.name?.firstName || 'Customer',
        },
        'verify-email',
      );

      await session.commitTransaction();
      session.endSession();

      EmailHelper.sendEmail(
        formattedEmail,
        emailHtml,
        'Verify your email for DeliGo',
      ).catch((err) => console.error('Email send failed:', err));

      return { messageKey: 'OTP_SENT_EMAIL' as const };
    }

    if (contactNumber) {
      const formattedContact = contactNumber.trim();
      const existingUser = await Customer.findOne({
        contactNumber: formattedContact,
      }).session(session);

      if (existingUser?.referredBy && referralCode) {
        throw new AppError(httpStatus.BAD_REQUEST, 'ALREADY_REFERRED');
      }

      const isTestNumber =
        formattedContact ===
        (config.customer.test_customer_contact_number as string);

      const res = await sendMobileOtp(formattedContact);
      const mobileOtpId = isTestNumber ? 'test-otp-id' : res.data.id;

      if (existingUser) {
        if (!existingUser.referredBy && referralCode) {
          await handleReferral(existingUser, referralCode, session);
        }
        await AuthUser.updateOne(
          { profileId: existingUser._id, role: USER_ROLE.CUSTOMER },
          {
            mobileOtpId,
            requiresOtpVerification: true,
          },
          { session },
        );
      } else {
        const userId = generateUserId('CUSTOMER');

        const newUsers = await Customer.create(
          [
            {
              userId,
              contactNumber: formattedContact,
            },
          ],
          { session },
        );
        const newUser = newUsers[0];

        await AuthUser.create(
          [
            {
              userId,
              profileId: newUser._id,
              profileModel: 'Customer',
              contactNumber: formattedContact,
              role: USER_ROLE.CUSTOMER,
              requiresOtpVerification: true,
              mobileOtpId,
            },
          ],
          { session },
        );

        if (referralCode) {
          await handleReferral(newUser, referralCode, session);
        }
      }

      await session.commitTransaction();
      session.endSession();

      return {
        messageKey: 'OTP_SENT_MOBILE' as const,
      };
    }
  } catch (err) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    session.endSession();
    console.error('Login Customer Transaction Error:', err);
    throw err;
  }
};

//update FCM Token
const updateFcmToken = async (
  currentUser: TCurrentUser,
  payload: { token: string; deviceId: string },
) => {
  const { token, deviceId } = payload;

  if (!token || !deviceId) {
    throw new AppError(httpStatus.BAD_REQUEST, 'FCM_REQUIRED');
  }

  if (!currentUser) {
    throw new AppError(httpStatus.NOT_FOUND, 'USER_NOT_FOUND');
  }

  const updatedUser = await AuthUser.findOneAndUpdate(
    { profileId: currentUser._id, 'loginDevices.deviceId': deviceId },
    {
      $set: {
        'loginDevices.$.fcmToken': token,
        'loginDevices.$.isLoggedIn': true,
        'loginDevices.$.lastLogin': new Date(),
      },
    },
    { new: true },
  );

  if (!updatedUser) {
    throw new AppError(httpStatus.NOT_FOUND, 'DEVICE_NOT_REGISTERED');
  }

  return {
    messageKey: 'FCM_SYNC_SUCCESS' as const,
  };
};

// Logout User
const logoutUser = async (currentUser: TCurrentUser, deviceId: string) => {
  const user = await AuthUser.findOne({
    userId: currentUser.userId,
  });

  const currentDeviceSession = user?.loginDevices.find(
    (device) => device.deviceId === deviceId,
  );

  if (!currentDeviceSession) {
    throw new AppError(httpStatus.NOT_FOUND, 'DEVICE_SESSION_NOT_FOUND');
  }

  await AuthUser.findOneAndUpdate(
    {
      userId: currentUser.userId,
      'loginDevices.deviceId': deviceId,
    },
    {
      $set: {
        'loginDevices.$.isLoggedIn': false,
        'loginDevices.$.lastLogout': new Date(),
      },
    },
    {
      new: true,
    },
  );

  const userRole = currentUser?.role || 'User';

  return {
    success: true,
    messageKey:
      userRole === 'CUSTOMER'
        ? ('CUSTOMER_LOGOUT_SUCCESS' as const)
        : ('USER_LOGOUT_SUCCESS' as const),
    variables: userRole === 'CUSTOMER' ? undefined : { role: userRole },
  };
};

// Change Password
const changePassword = async (
  currentUser: TCurrentUser,
  payload: { oldPassword: string; newPassword: string },
) => {
  if (currentUser?.role === 'CUSTOMER') {
    throw new AppError(httpStatus.FORBIDDEN, 'CUSTOMER_PASSWORD_CHANGE_DENIED');
  }

  // checking if the user is blocked

  const userStatus = currentUser?.status;

  const userExists = await AuthUser.findOne({
    userId: currentUser.userId,
    role: currentUser.role,
  }).select('+password');

  if (!userExists) {
    throw new AppError(httpStatus.NOT_FOUND, 'USER_NOT_FOUND');
  }

  if (
    userStatus === USER_STATUS.REJECTED ||
    userStatus === USER_STATUS.BLOCKED
  ) {
    throw new AppError(httpStatus.FORBIDDEN, 'USER_STATUS_RESTRICTED', {
      status: String(userStatus),
    });
  }

  const isPasswordMatched = await AuthUser.isPasswordMatched(
    payload.oldPassword,
    userExists.password as string,
  );

  //checking if the password is correct

  if (!isPasswordMatched)
    throw new AppError(httpStatus.FORBIDDEN, 'OLD_PASSWORD_NOT_MATCHED');

  //hash new password
  const newHashedPassword = await bcryptjs.hash(
    payload.newPassword,
    Number(config.bcrypt_salt_rounds),
  );

  await AuthUser.updateOne(
    {
      userId: currentUser.userId,
      role: currentUser.role,
    },
    {
      password: newHashedPassword,
      passwordChangedAt: new Date(),
    },
  );

  return {
    messageKey: 'PASSWORD_UPDATE_SUCCESS' as const,
  };
};

// Forgot Password
const forgotPassword = async (payload: { email: string; role: TUserRole }) => {
  const { email, role } = payload;

  if (role === 'CUSTOMER') {
    throw new AppError(httpStatus.FORBIDDEN, 'CUSTOMER_PASSWORD_RESET_DENIED');
  }
  const formattedEmail = email.trim().toLowerCase();
  const user = await AuthUser.findOne({
    email: formattedEmail,
    role,
    isDeleted: false,
  }).populate('profileId', 'name');

  const populatedUser = user?.profileId as any;

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'USER_NOT_FOUND_FOR_RESET');
  }

  if (!user.isEmailVerified) {
    throw new AppError(httpStatus.FORBIDDEN, 'VERIFY_EMAIL_REQUIRED');
  }

  // checking if the user is blocked
  const userStatus = user?.status;

  if (userStatus === USER_STATUS.BLOCKED) {
    throw new AppError(httpStatus.FORBIDDEN, 'USER_BLOCKED');
  }

  const token = await user.createPasswordResetToken();

  let resetURL;

  if (user?.role === 'ADMIN') {
    resetURL = `${config.frontend_urls.admin}/reset-password?token=${token}`;
  } else if (user?.role === 'VENDOR' || user?.role === 'SUB_VENDOR') {
    resetURL = `${config.frontend_urls.vendor}/reset-password?token=${token}`;
  } else if (user?.role === 'FLEET_MANAGER') {
    resetURL = `${config.frontend_urls.fleet_manager}/reset-password?token=${token}`;
  } else if (user?.role === 'DELIVERY_PARTNER') {
    resetURL = `${config.frontend_urls.delivery_partner}/reset-password?token=${token}`;
  }

  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  const redisKey = `reset-token:${hashedToken}`;
  const redisValue = JSON.stringify({
    userId: user._id,
    email: formattedEmail,
    role: user.role,
  });

  await RedisService.set(redisKey, redisValue, 600);

  // create email html
  const emailHtml = await EmailHelper.createEmailContent(
    {
      resetPasswordLink: resetURL,
      userName: populatedUser?.name?.firstName || 'User',
      currentYear: new Date().getFullYear(),
      date: new Date().toDateString(),
    },
    'reset-password',
  );

  // send email
  try {
    await EmailHelper.sendEmail(
      formattedEmail,
      emailHtml,
      'Reset your password for DeliGo',
    );
  } catch (err: any) {
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'SOMETHING_WENT_WRONG',
    );
  }

  return {
    messageKey: 'PASSWORD_RESET_LINK_SUCCESS' as const,
  };
};

// reset Password
const resetPassword = async (payload: {
  email: string;
  role: TUserRole;
  token: string;
  newPassword: string;
}) => {
  const { email, role, token, newPassword } = payload;
  const formattedEmail = email.trim().toLowerCase();

  if (role === 'CUSTOMER') {
    throw new AppError(httpStatus.FORBIDDEN, 'CUSTOMER_PASSWORD_RESET_DENIED');
  }

  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  const redisKey = `reset-token:${hashedToken}`;
  const tokenData = await RedisService.get(redisKey);

  if (!tokenData) {
    throw new AppError(httpStatus.BAD_REQUEST, 'TOKEN_INVALID_OR_EXPIRED');
  }

  const parsedData = tokenData as {
    userId: string;
    email: string;
    role: string;
  };
  if (parsedData.email !== formattedEmail || parsedData.role !== role) {
    throw new AppError(httpStatus.BAD_REQUEST, 'TOKEN_MISMATCH');
  }

  const user = await AuthUser.findOne({
    email: formattedEmail,
    role,
    isDeleted: false,
  });

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'USER_NOT_FOUND_FOR_RESET');
  }

  if (
    user.status === USER_STATUS.BLOCKED ||
    user.status === USER_STATUS.REJECTED
  ) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'ACCOUNT_MODIFICATION_RESTRICTED',
      {
        status: user.status.toLowerCase(),
      },
    );
  }

  if (user.loginDevices && user.loginDevices.length > 0) {
    user.loginDevices = user.loginDevices.map((device: any) => ({
      ...device,
      isLoggedIn: false,
    }));
  }

  user.password = newPassword;
  user.passwordChangedAt = new Date();

  await user.save();

  await RedisService.del(redisKey);

  return {
    success: true,
    messageKey: 'PASSWORD_RESET_SUCCESS' as const,
  };
};

// Refresh Token
const refreshToken = async (token: string) => {
  // checking if the given token is valid
  const decoded = verifyToken(
    token,
    config.jwt.jwt_refresh_secret as string,
  ) as JwtPayload;

  const { iat, userId, deviceId } = decoded;

  const user = await AuthUser.findOne({
    userId,
    isDeleted: false,
  }).populate('profileId', 'userId name');

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'USER_NOT_FOUND_FOR_RESET');
  }
  const userProfile = user?.profileId as any;

  const targetDeviceSession = user.loginDevices?.find(
    (d: any) => d.deviceId === deviceId,
  );

  if (!targetDeviceSession || targetDeviceSession.isLoggedIn === false) {
    throw new AppError(httpStatus.UNAUTHORIZED, 'SESSION_EXPIRED');
  }

  // checking if the user is blocked
  const userStatus = user?.status;

  if (userStatus === USER_STATUS.BLOCKED) {
    throw new AppError(httpStatus.FORBIDDEN, 'USER_BLOCKED');
  }

  if (
    user.passwordChangedAt &&
    AuthUser.isJWTIssuedBeforePasswordChanged(
      user.passwordChangedAt,
      iat as number,
    )
  ) {
    throw new AppError(httpStatus.UNAUTHORIZED, 'NOT_AUTHORIZED');
  }

  const jwtPayload = {
    userId: user?.userId,
    name: {
      firstName: userProfile?.name?.firstName,
      lastName: userProfile?.name?.lastName,
    },
    email: user?.email,
    contactNumber: user?.contactNumber,
    role: user?.role,
    status: user?.status,
    deviceId: deviceId,
  };

  const accessToken = createToken(
    jwtPayload,
    config.jwt.jwt_access_secret as string,
    config.jwt.jwt_access_expires_in as string,
  );

  return {
    messageKey: 'REFRESH_TOKEN_SUCCESS' as const,
    accessToken,
  };
};

// submit approval request service
const submitForApproval = async (userId: string, currentUser: TCurrentUser) => {
  const authUser = await AuthUser.findOne({ userId });
  if (!authUser || authUser.isDeleted) {
    throw new AppError(httpStatus.NOT_FOUND, 'USER_NOT_FOUND');
  }

  if (authUser?.status === 'SUBMITTED') {
    throw new AppError(httpStatus.BAD_REQUEST, 'ALREADY_SUBMITTED_APPROVAL');
  }
  if (authUser?.status === 'APPROVED') {
    throw new AppError(httpStatus.BAD_REQUEST, 'ALREADY_APPROVED');
  }

  const modelName = ROLE_COLLECTION_MAP[authUser.role as TUserRole];
  if (!modelName) {
    throw new AppError(httpStatus.BAD_REQUEST, 'INVALID_ROLE_MAPPING');
  }

  const TargetModel = mongoose.model(modelName) as unknown as Model<any>;
  const submittedProfile = await TargetModel.findById(authUser.profileId);

  if (!submittedProfile) {
    throw new AppError(httpStatus.NOT_FOUND, 'PROFILE_DETAILS_NOT_FOUND');
  }

  const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(currentUser.role);

  if (!isAdmin) {
    if (authUser?.role === 'DELIVERY_PARTNER') {
      const isFleetManager = currentUser.role === 'FLEET_MANAGER';
      const isOwner =
        submittedProfile.registeredBy?.id?.toString() ===
        currentUser._id.toString();

      if (isFleetManager && !isOwner) {
        throw new AppError(
          httpStatus.FORBIDDEN,
          'SUBMIT_APPROVAL_PERMISSION_DENIED_FLEET',
        );
      }

      if (!isFleetManager && authUser.userId !== currentUser.userId) {
        throw new AppError(
          httpStatus.FORBIDDEN,
          'SUBMIT_APPROVAL_OWN_PROFILE_ONLY',
        );
      }
    } else {
      if (authUser.userId !== currentUser.userId) {
        throw new AppError(
          httpStatus.FORBIDDEN,
          'SUBMIT_APPROVAL_PERMISSION_DENIED',
        );
      }
    }
  }

  const submissionTime = new Date();

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    await AuthUser.findOneAndUpdate(
      { _id: authUser._id },
      {
        $set: {
          status: 'SUBMITTED',
        },
      },
      { session, new: true },
    );

    await TargetModel.findByIdAndUpdate(
      authUser.profileId,
      {
        $set: {
          isUpdateLocked: true,
          status: 'SUBMITTED',
          submittedForApprovalAt: submissionTime,
        },
      },
      { session, new: true },
    );

    await session.commitTransaction();
    session.endSession();
  } catch (error: any) {
    await session.abortTransaction();
    session.endSession();
    console.error('[Approval Submission Transaction Failed]:', error.message);
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'APPROVAL_TRANSACTION_FAILED',
    );
  }

  const userName =
    `${submittedProfile.name?.firstName || ''} ${submittedProfile.name?.lastName || ''}`.trim() ||
    'A User';

  const formattedTime = submissionTime.toLocaleString('en-US', {
    hour: 'numeric',
    minute: 'numeric',
    hour12: true,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  (async () => {
    try {
      const emailHtml = await EmailHelper.createEmailContent(
        {
          userName: submittedProfile.name?.firstName || 'User',
          userId: submittedProfile.userId,
          currentYear: submissionTime.getFullYear(),
          userRole: authUser.role,
          date: submissionTime.toDateString(),
        },
        'user-approval-submission-notification',
      );

      await EmailHelper.sendEmail(
        authUser.email,
        emailHtml,
        `New ${authUser?.role} Submission for Approval`,
      );
    } catch (err: any) {
      console.error(
        'Safe Background Guard -> Email Delivery Failed:',
        err.message,
      );
    }

    try {
      NotificationService.sendToRole(
        ['ADMIN', 'SUPER_ADMIN'],
        `New ${authUser?.role} Submission for Approval`,
        `${userName} (${authUser?.role}) has submitted for approval at ${formattedTime}.`,
        { userId: authUser?.profileId.toString(), role: authUser?.role },
        'default',
        'ACCOUNT',
      );
    } catch (err: any) {
      console.error(
        'Safe Background Guard -> Admin Push Notification Failed:',
        err.message,
      );
    }
  })();

  return {
    messageKey: 'SUBMIT_APPROVAL_SUCCESS' as const,
    variables: { role: authUser?.role as string },
  };
};

// Active or Block User Service
const approvedOrRejectedUser = async (
  userId: string,
  payload: TApprovedRejectsPayload,
  currentUser: TCurrentUser,
) => {
  if (userId === currentUser.userId) {
    throw new AppError(httpStatus.BAD_REQUEST, 'CANNOT_CHANGE_OWN_STATUS');
  }

  const adminUser = await AuthUser.findOne({
    userId: currentUser.userId,
    isDeleted: false,
  });

  if (!adminUser || !['ADMIN', 'SUPER_ADMIN'].includes(adminUser.role)) {
    throw new AppError(httpStatus.FORBIDDEN, 'ADMIN_NOT_FOUND_OR_UNAUTHORIZED');
  }

  const authUser = await AuthUser.findOne({
    userId: userId,
    isDeleted: false,
  });

  if (!authUser) {
    throw new AppError(httpStatus.NOT_FOUND, 'TARGET_USER_NOT_FOUND');
  }

  const role = authUser.role as TUserRole;
  const targetAuthStatus = payload.status;

  if (authUser.status === targetAuthStatus) {
    throw new AppError(httpStatus.BAD_REQUEST, 'USER_ALREADY_IN_STATUS', {
      status: targetAuthStatus.toLowerCase(),
    });
  }

  if (
    (targetAuthStatus === 'REJECTED' || targetAuthStatus === 'BLOCKED') &&
    !payload.remarks?.trim()
  ) {
    throw new AppError(httpStatus.BAD_REQUEST, 'REMARKS_REQUIRED', {
      status: targetAuthStatus.toLowerCase(),
    });
  }

  const modelName = ROLE_COLLECTION_MAP[role];
  if (!modelName) {
    throw new AppError(httpStatus.BAD_REQUEST, 'INVALID_ROLE_MAPPING');
  }

  const TargetModel = mongoose.model(modelName) as unknown as Model<any>;
  const submittedProfile = await TargetModel.findById(authUser.profileId);

  if (!submittedProfile) {
    throw new AppError(httpStatus.NOT_FOUND, 'PROFILE_DETAILS_NOT_FOUND');
  }

  const finalRemarks =
    payload.remarks?.trim() ||
    (targetAuthStatus === 'APPROVED'
      ? 'Congratulations! Your account has successfully met all the required criteria, and we’re excited to have you on board.'
      : '');

  const actionTimestamp = new Date();

  authUser.status = targetAuthStatus;
  submittedProfile.status = targetAuthStatus;
  submittedProfile.remarks = finalRemarks;
  submittedProfile.approvedOrRejectedOrBlockedAt = actionTimestamp;

  switch (targetAuthStatus) {
    case 'APPROVED':
      submittedProfile.approvedBy = adminUser.profileId;
      submittedProfile.rejectedBy = undefined;
      submittedProfile.blockedBy = undefined;
      break;

    case 'REJECTED':
      submittedProfile.rejectedBy = adminUser.profileId;
      submittedProfile.approvedBy = undefined;
      submittedProfile.blockedBy = undefined;

      submittedProfile.isUpdateLocked = false;
      break;

    case 'BLOCKED':
      submittedProfile.blockedBy = adminUser.profileId;
      submittedProfile.approvedBy = undefined;
      submittedProfile.rejectedBy = undefined;
      break;
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    await authUser.save({ session });
    await submittedProfile.save({ session });

    await session.commitTransaction();
    session.endSession();
  } catch (error: any) {
    await session.abortTransaction();
    session.endSession();
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'STATUS_UPDATE_TRANSACTION_FAILED',
    );
  }

  const notificationTitleMap: Record<string, string> = {
    APPROVED: 'Your account has been approved',
    REJECTED: 'Your account has been rejected',
    BLOCKED: 'Your account has been blocked',
  };

  (async () => {
    try {
      NotificationService.sendToUser(
        authUser.userId,
        notificationTitleMap[targetAuthStatus],
        finalRemarks,
        {
          userId: authUser.profileId.toString(),
          role: role,
        },
        'default',
        'ACCOUNT',
      );
    } catch (err: any) {
      console.error(
        'Background Guard -> Push Notification Failed:',
        err.message,
      );
    }

    if (
      [
        'ADMIN',
        'SUPER_ADMIN',
        'FLEET_MANAGER',
        'VENDOR',
        'DELIVERY_PARTNER',
        'SUB_VENDOR',
      ].includes(role) ||
      (role === 'CUSTOMER' && authUser.email)
    ) {
      try {
        const emailHtml = await EmailHelper.createEmailContent(
          {
            userName: submittedProfile.name?.firstName || 'User',
            userRole: role,
            currentYear: actionTimestamp.getFullYear(),
            remarks: finalRemarks,
            date: actionTimestamp.toDateString(),
            status: targetAuthStatus,
          },
          'user-approval-notification',
        );

        const emailSubject = `DeliGo - Your ${role} Application has been ${targetAuthStatus.toLowerCase()}`;

        await EmailHelper.sendEmail(
          authUser.email || submittedProfile.email,
          emailHtml,
          emailSubject,
        );
      } catch (err: any) {
        console.error(
          'Background Guard -> Email Delivery Failed:',
          err.message,
        );
      }
    }
  })();

  return {
    success: true,
    messageKey: 'STATUS_UPDATE_SUCCESS' as const,
    variables: {
      role,
      status: targetAuthStatus.toLowerCase(),
    },
  };
};

// soft delete user service
const softDeleteUser = async (userId: string, currentUser: TCurrentUser) => {
  if (currentUser.status !== 'APPROVED') {
    throw new AppError(httpStatus.FORBIDDEN, 'DELETE_UNAPPROVED_DENIED', {
      status: currentUser.status,
    });
  }

  const targetAuthUser = await AuthUser.findOne({ userId, isDeleted: false });
  if (!targetAuthUser) {
    throw new AppError(httpStatus.NOT_FOUND, 'USER_NOT_FOUND_OR_DELETED');
  }

  if (targetAuthUser.role === USER_ROLE.SUPER_ADMIN) {
    throw new AppError(httpStatus.FORBIDDEN, 'CANNOT_DELETE_SUPER_ADMIN');
  }

  const nonAdminRoles = [
    'CUSTOMER',
    'VENDOR',
    'SUB_VENDOR',
    'DELIVERY_PARTNER',
    'FLEET_MANAGER',
  ];

  if (nonAdminRoles.includes(currentUser.role)) {
    if (currentUser.userId !== targetAuthUser.userId) {
      throw new AppError(httpStatus.FORBIDDEN, 'DELETE_PERMISSION_DENIED');
    }
  }

  if (
    currentUser.role === 'FLEET_MANAGER' &&
    targetAuthUser.role === 'DELIVERY_PARTNER'
  ) {
    const modelName = ROLE_COLLECTION_MAP[targetAuthUser.role];
    if (modelName) {
      const TargetModel = mongoose.model(modelName) as unknown as Model<any>;
      const targetProfile = await TargetModel.findById(
        targetAuthUser.profileId,
      );

      if (
        targetProfile?.registeredBy?.id?.toString() !==
          currentUser._id.toString() &&
        currentUser.userId !== targetAuthUser.userId
      ) {
        throw new AppError(httpStatus.FORBIDDEN, 'DELETE_FLEET_PARTNER_DENIED');
      }
    }
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    targetAuthUser.isDeleted = true;
    targetAuthUser.loginDevices = [];
    await targetAuthUser.save({ session });

    const modelName = ROLE_COLLECTION_MAP[targetAuthUser.role as TUserRole];
    if (modelName) {
      const TargetModel = mongoose.model(modelName) as unknown as Model<any>;
      await TargetModel.findByIdAndUpdate(
        targetAuthUser.profileId,
        { $set: { isDeleted: true } },
        { session },
      );
    }

    await session.commitTransaction();
    session.endSession();
  } catch (error: any) {
    await session.abortTransaction();
    session.endSession();
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'SOFT_DELETE_TRANSACTION_FAILED',
    );
  }

  return {
    success: true,
    messageKey: 'SOFT_DELETE_SUCCESS' as const,
    variables: { role: targetAuthUser.role as string },
  };
};

// permanent delete user service
const permanentDeleteUser = async (
  userId: string,
  currentUser: TCurrentUser,
) => {
  if (currentUser.status !== 'APPROVED') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'PERMANENT_DELETE_UNAPPROVED_DENIED',
      { status: currentUser.status },
    );
  }

  const targetAuthUser = await AuthUser.findOne({ userId });
  if (!targetAuthUser) {
    throw new AppError(httpStatus.NOT_FOUND, 'PERMANENT_DELETE_NOT_FOUND');
  }
  if (targetAuthUser.role === USER_ROLE.SUPER_ADMIN) {
    throw new AppError(httpStatus.FORBIDDEN, 'CANNOT_DELETE_SUPER_ADMIN');
  }

  if (!targetAuthUser.isDeleted) {
    throw new AppError(httpStatus.BAD_REQUEST, 'MUST_BE_SOFT_DELETED_FIRST');
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const modelName = ROLE_COLLECTION_MAP[targetAuthUser.role as TUserRole];
    if (modelName) {
      const TargetModel = mongoose.model(modelName) as unknown as Model<any>;
      await TargetModel.findByIdAndDelete(targetAuthUser.profileId).session(
        session,
      );
    }

    await AuthUser.deleteOne({ _id: targetAuthUser._id }).session(session);

    await session.commitTransaction();
    session.endSession();
  } catch (error: any) {
    await session.abortTransaction();
    session.endSession();
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'PERMANENT_DELETE_TRANSACTION_FAILED',
    );
  }

  return {
    success: true,
    messageKey: 'PERMANENT_DELETE_SUCCESS' as const,
    variables: { role: targetAuthUser.role as string },
  };
};

export const AuthServices = {
  registerUser,
  onboardUser,
  verifyOtp,
  resendOtp,
  loginUser,
  loginCustomer,
  updateFcmToken,
  logoutUser,
  changePassword,
  forgotPassword,
  resetPassword,
  refreshToken,
  approvedOrRejectedUser,
  submitForApproval,
  softDeleteUser,
  permanentDeleteUser,
};
