/* eslint-disable @typescript-eslint/no-explicit-any */
import httpStatus from 'http-status';
import AppError from '../../errors/AppError';
import generateUserId, { USER_TYPE_MAP } from '../../utils/generateUserId';
import generateOtp from '../../utils/generateOtp';
import { Model } from 'mongoose';
import bcryptjs from 'bcryptjs';
import {
  ALL_USER_MODELS,
  ROLE_ONBOARD_PERMISSIONS,
  TApprovedRejectsPayload,
  USER_MODEL_MAP,
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
import { TLoginCustomer, TLoginUser } from './auth.interface';
import { findUserByEmail, findUserById } from '../../utils/findUserByEmailOrId';
import { JwtPayload } from 'jsonwebtoken';
import crypto from 'crypto';
import config from '../../config';
import { Customer } from '../Customer/customer.model';
import { sendMobileOtp } from '../../utils/sendMobileOtp';
import { verifyMobileOtp } from '../../utils/verifyMobileOtp';
import { resendMobileOtp } from '../../utils/resendMobileOtp';
import { Admin } from '../Admin/admin.model';
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
const registerUser = async <
  T extends {
    email: string;
    role: TUserRole;
    password: string;
    isEmailVerified?: boolean;
  },
>(
  payload: T,
  url: string,
) => {
  const userType = url.split('/register')[1] as keyof typeof USER_TYPE_MAP;
  const userTypeData = USER_TYPE_MAP[userType];
  const modelData = USER_MODEL_MAP[userType];
  if (!userTypeData || !modelData) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Invalid registration path');
  }

  const { Model: TargetModel, idField } = modelData;
  const mongooseModel = TargetModel as unknown as Model<T>;

  // Generate userId & OTP
  const userId = generateUserId(userType);
  payload.role = userTypeData.role;
  const { otp } = generateOtp();

  const existingUser = await AuthUser.findOne({ email: payload.email }).select(
    'email role status userObjectId _id',
  );
  if (existingUser) {
    if (existingUser.isEmailVerified) {
      throw new AppError(
        httpStatus.CONFLICT,
        `${existingUser.email} is already registered as ${existingUser.role}.`,
      );
    }
    const prevModelData =
      ROLE_COLLECTION_MAP[existingUser.role as keyof typeof USER_ROLE];
    if (prevModelData) {
      const prevModel = mongoose.model(prevModelData);
      await prevModel.deleteOne({ _id: existingUser.profileId });
    }

    await AuthUser.deleteOne({ _id: existingUser._id });
  }

  const emailHtml = await EmailHelper.createEmailContent(
    {
      otp,
      userEmail: payload.email,
      currentYear: new Date().getFullYear(),
      date: new Date().toDateString(),
      user: payload?.role.toLocaleLowerCase(),
    },
    'verify-email',
  );

  const rawPassword = payload.password;
  const { password: _, ...profilePayload } = payload;

  const session = await mongoose.startSession();
  session.startTransaction();

  let createdUser: any = null;
  try {
    const result = await mongooseModel.create(
      [
        {
          ...profilePayload,
          [idField]: userId,
          role: payload.role,
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
          profileModel: TargetModel.modelName,
          email: payload.email,
          password: rawPassword,
          role: payload.role,
          status: 'PENDING',
          isDeleted: false,
        },
      ],
      { session },
    );

    const redisOtpKey = `otp:${payload.email}`;
    await RedisService.set(redisOtpKey, otp, 300);

    await session.commitTransaction();
    session.endSession();
  } catch (err: any) {
    await session.abortTransaction();
    session.endSession();

    console.log(err);

    if (err?.code === 11000) {
      throw new AppError(
        httpStatus.CONFLICT,
        'The email already exists. Please use another email.',
      );
    }
    throw err;
  }

  EmailHelper.sendEmail(
    payload.email,
    emailHtml,
    'Verify your email for DeliGo',
  ).catch((err) => console.error('Email sending failed:', err));

  return {
    message: `${payload.role} registered successfully. Check your email for OTP.`,
    data: {
      email: payload.email,
      role: payload.role,
      status: 'PENDING',
    },
  };
};

const onboardUser = async <
  T extends {
    email: string;
    role: TUserRole;
    password: string;
    isEmailVerified?: boolean;
    registeredBy?: any;
  },
>(
  payload: T,
  targetRole: string,
  currentUser: TCurrentUser,
) => {
  const mapKey = `/create-${targetRole}` as keyof typeof USER_TYPE_MAP;

  const userTypeData = USER_TYPE_MAP[mapKey];
  const modelData = USER_MODEL_MAP[mapKey];

  if (!userTypeData || !modelData) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Invalid onboarding target role',
    );
  }

  if (currentUser.status !== 'APPROVED') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      `Your account is ${currentUser.status}. Only approved users can onboard others.`,
    );
  }

  const allowedRoles = ROLE_ONBOARD_PERMISSIONS[targetRole.toLowerCase()];

  if (allowedRoles && !allowedRoles.includes(currentUser.role)) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      `You do not have permission to onboard a ${targetRole.replace('-', ' ')}`,
    );
  }

  const { Model: TargetModel, idField } = modelData;
  const mongooseModel = TargetModel as unknown as Model<T>;

  const userId = generateUserId(mapKey);
  payload.role = userTypeData.role;
  const { otp } = generateOtp();

  const existingUser = await AuthUser.findOne({ email: payload.email });

  let registeredByValue: any;
  if (
    ['vendor', 'sub-vendor', 'delivery-partner'].includes(
      targetRole.toLowerCase(),
    )
  ) {
    registeredByValue = {
      id: currentUser._id,
      model:
        currentUser.role === 'FLEET_MANAGER'
          ? 'FleetManager'
          : currentUser.role === 'VENDOR'
            ? 'Vendor'
            : 'Admin',
      role: currentUser.role,
    };
  } else {
    registeredByValue = currentUser._id;
  }

  const session = await mongoose.startSession();

  let createdUser;
  try {
    session.startTransaction();

    if (existingUser) {
      if (existingUser.isEmailVerified) {
        throw new AppError(
          httpStatus.CONFLICT,
          `${existingUser.email} is already registered as ${existingUser.role}.`,
        );
      }
      const prevModelData = ROLE_COLLECTION_MAP[existingUser.role as TUserRole];
      if (prevModelData) {
        const prevModel = mongoose.model(prevModelData);
        await prevModel.deleteOne({ userId: existingUser.userId }, { session });
      }
      await AuthUser.deleteOne({ _id: existingUser._id }, { session });
    }

    const rawPassword = payload.password;
    const { password: _, ...profilePayload } = payload;

    const result = await mongooseModel.create(
      [
        {
          ...profilePayload,
          [idField]: userId,
          registeredBy: registeredByValue,
          status: 'PENDING',
          role: payload.role,
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
          profileModel: TargetModel.modelName,
          email: payload.email,
          password: rawPassword,
          role: payload.role,
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
      throw new AppError(
        httpStatus.CONFLICT,
        'User Id or Email already exists',
      );
    }
    throw err;
  } finally {
    await session.endSession();
  }

  const redisOtpKey = `otp:${payload.email}`;
  await RedisService.set(redisOtpKey, otp, 300);

  const emailHtml = await EmailHelper.createEmailContent(
    {
      otp,
      userEmail: payload.email,
      currentYear: new Date().getFullYear(),
      date: new Date().toDateString(),
      user: payload.role.toLowerCase(),
    },
    'verify-email',
  );

  EmailHelper.sendEmail(
    payload.email,
    emailHtml,
    'Verify your email for DeliGo',
  ).catch((err) => console.error('Email sending failed:', err));

  return {
    message: `${payload.role} onboarded successfully. Verification email sent to ${payload.email}`,
    data: {
      email: payload.email,
      role: payload.role,
      status: 'PENDING',
    },
  };
};

// Login User
const loginUser = async (
  payload: TLoginUser & { deviceDetails: TLoginDevice; forceLogin?: boolean },
) => {
  // checking if the user is exist
  const user = await AuthUser.findOne({
    email: payload?.email,
    isDeleted: false,
  });
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }

  // checking if the user is blocked
  const userStatus = user?.status;

  if (userStatus === USER_STATUS.BLOCKED) {
    throw new AppError(httpStatus.FORBIDDEN, 'This user is blocked!');
  }

  if (!user?.isEmailVerified) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'This user is not verified. Please verify your email.',
    );
  }

  if (!payload.password) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Password  information missing');
  }

  //checking if the password is correct
  const isPasswordMatched = await AuthUser.isPasswordMatched(
    payload.password,
    user.password as string,
  );

  if (!isPasswordMatched) {
    throw new AppError(httpStatus.UNAUTHORIZED, 'Password did not match');
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
    message: `${user?.role} logged in successfully!`,
  };
};

// login customer
const loginCustomer = async (payload: TLoginCustomer) => {
  const { email, contactNumber, referralCode } = payload;

  if (!email && !contactNumber) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Email or contact number is required',
    );
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

  const verifyNoRoleConflict = async (
    field: 'email' | 'contactNumber',
    value: string,
  ) => {
    const foundAuthUser = await AuthUser.findOne({ [field]: value });
    if (foundAuthUser && foundAuthUser.role !== USER_ROLE.CUSTOMER) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        `This ${
          field === 'email' ? 'email' : 'contact number'
        } is already registered as (${foundAuthUser.role}).`,
      );
    }
  };

  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    if (email) {
      await verifyNoRoleConflict('email', email);

      const existingCustomer = await Customer.findOne({ email }).session(
        session,
      );

      if (existingCustomer?.referredBy && referralCode) {
        throw new AppError(
          httpStatus.BAD_REQUEST,
          'You have already been referred and cannot apply another referral code.',
        );
      }

      const { otp } = generateOtp();
      const redisOtpKey = `otp:${email}`;
      await RedisService.set(redisOtpKey, otp, 300);

      if (!existingCustomer) {
        const userId = generateUserId('/create-customer');

        const newUsers = await Customer.create(
          [
            {
              userId,
              email,
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
              email,
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
          { profileId: existingCustomer._id },
          { requiresOtpVerification: true },
          { session },
        );
      }

      const emailHtml = await EmailHelper.createEmailContent(
        {
          otp,
          userEmail: email,
          currentYear: new Date().getFullYear(),
          date: new Date().toDateString(),
          user: existingCustomer?.name?.firstName || 'Customer',
        },
        'verify-email',
      );

      await session.commitTransaction();
      session.endSession();

      EmailHelper.sendEmail(
        email,
        emailHtml,
        'Verify your email for DeliGo',
      ).catch((err) => console.error('Email send failed:', err));

      return { message: 'OTP sent to your email. Please verify to login.' };
    }

    if (contactNumber) {
      await verifyNoRoleConflict('contactNumber', contactNumber);

      const existingUser = await Customer.findOne({ contactNumber }).session(
        session,
      );

      if (existingUser?.referredBy && referralCode) {
        throw new AppError(
          httpStatus.BAD_REQUEST,
          'You have already been referred and cannot apply another referral code.',
        );
      }

      const isTestNumber =
        contactNumber ===
        (config.customer.test_customer_contact_number as string);

      const res = await sendMobileOtp(contactNumber);
      const mobileOtpId = isTestNumber ? 'test-otp-id' : res.data.id;

      if (existingUser) {
        if (!existingUser.referredBy && referralCode) {
          await handleReferral(existingUser, referralCode, session);
        }
        await AuthUser.updateOne(
          { profileId: existingUser._id },
          {
            mobileOtpId,
            requiresOtpVerification: true,
          },
          { session },
        );
      } else {
        const userId = generateUserId('/create-customer');

        const newUsers = await Customer.create(
          [
            {
              userId,
              contactNumber,
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
              contactNumber,
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
        message: 'OTP sent to your mobile number. Please verify to login.',
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
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'FCM token and device ID are required',
    );
  }

  if (!currentUser) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
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
    throw new AppError(
      httpStatus.NOT_FOUND,
      'Device not registered for this user',
    );
  }

  return {
    message: 'FCM token synchronized successfully',
  };
};

// Logout User
const logoutUser = async (currentUser: TCurrentUser, deviceId: string) => {
  const updatePipeline: any[] = [
    {
      $set: {
        loginDevices: {
          $map: {
            input: '$loginDevices',
            as: 'device',
            in: {
              $cond: {
                if: { $eq: ['$$device.deviceId', deviceId] },
                then: {
                  $mergeObjects: [
                    '$$device',
                    { isLoggedIn: false, lastLogout: new Date() },
                  ],
                },
                else: '$$device',
              },
            },
          },
        },
        requiresOtpVerification:
          currentUser.role === 'CUSTOMER'
            ? {
                $cond: {
                  if: { $in: [deviceId, '$loginDevices.deviceId'] },
                  then: true,
                  else: '$requiresOtpVerification',
                },
              }
            : '$requiresOtpVerification',
      },
    },
  ];

  const updatedUser = await AuthUser.findOneAndUpdate(
    { profileId: currentUser._id },
    updatePipeline,
    {
      new: true,
    },
  );

  if (!updatedUser) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }

  const targetDevice = updatedUser.loginDevices?.find(
    (d: any) => d.deviceId === deviceId,
  );

  if (!targetDevice) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      'Device not registered for this user. No changes applied.',
    );
  }

  return {
    success: true,
    message:
      currentUser.role === 'CUSTOMER'
        ? 'Customer logged out and email verification reset'
        : `${currentUser?.role} logged out successfully!`,
  };
};

// Change Password
const changePassword = async (
  currentUser: TCurrentUser,
  payload: { oldPassword: string; newPassword: string },
) => {
  if (currentUser?.role === 'CUSTOMER') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'Customer no need to change password',
    );
  }

  // checking if the user is blocked

  const userStatus = currentUser?.status;

  if (
    userStatus === USER_STATUS.REJECTED ||
    userStatus === USER_STATUS.BLOCKED
  ) {
    throw new AppError(httpStatus.FORBIDDEN, `This user is ${userStatus}!`);
  }

  const isPasswordMatched = await AuthUser.isPasswordMatched(
    payload.oldPassword,
    currentUser.password as string,
  );

  //checking if the password is correct

  if (!isPasswordMatched)
    throw new AppError(httpStatus.FORBIDDEN, 'Old password does not match');

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
    message: 'Password updated successfully!',
  };
};

// Forgot Password
const forgotPassword = async (email: string) => {
  const user = await AuthUser.findOne({ email, isDeleted: false })
    .populate('profileId', 'name')
    .select('role status profileId');

  const populatedUser = user?.profileId as any;

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'This user is not found!');
  }

  if (user?.role === 'CUSTOMER') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'Customer no need to reset password',
    );
  }

  // checking if the user is blocked
  const userStatus = user?.status;

  if (userStatus === USER_STATUS.BLOCKED) {
    throw new AppError(httpStatus.FORBIDDEN, 'This user is blocked!');
  }

  const token = await user.createPasswordResetToken();

  let resetURL;

  if (user?.role === 'ADMIN') {
    resetURL = `${config.frontend_urls.frontend_url_admin}/reset-password?token=${token}`;
  } else if (user?.role === 'VENDOR') {
    resetURL = `${config.frontend_urls.frontend_url_vendor}/reset-password?token=${token}`;
  } else if (user?.role === 'FLEET_MANAGER') {
    resetURL = `${config.frontend_urls.frontend_url_fleet_manager}/reset-password?token=${token}`;
  }

  await user.save({ validateBeforeSave: false });

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
      email,
      emailHtml,
      'Reset your password for DeliGo',
    );
  } catch (err: any) {
    throw new AppError(httpStatus.INTERNAL_SERVER_ERROR, err.message);
  }

  return {
    message: 'Password reset link sent to your email address successfully',
    // token,
  };
};

// reset Password
const resetPassword = async (
  email: string,
  token: string,
  newPassword: string,
) => {
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  const user = await AuthUser.findOne({
    email: email.trim().toLowerCase(),
    passwordResetToken: hashedToken,
    passwordResetTokenExpiresAt: { $gt: new Date() },
    isDeleted: false,
  });

  if (!user) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Reset token is invalid or has been expired',
    );
  }

  if (user.role === 'CUSTOMER') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'Customers do not need to reset passwords via this method',
    );
  }

  if (
    user.status === USER_STATUS.BLOCKED ||
    user.status === USER_STATUS.REJECTED
  ) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      `This user account is currently ${user.status.toLowerCase()} and cannot be modified.`,
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

  user.passwordResetToken = undefined;
  user.passwordResetTokenExpiresAt = undefined;

  await user.save();

  return {
    success: true,
    message:
      'Password reset successfully! All other active sessions have been securely terminated.',
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

  const result = await findUserById({ userId });

  const user = result?.user;
  const model = result?.model;

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'This user is not found!');
  }

  const isDeviceValid = user.loginDevices?.some(
    (d: TLoginDevice) => d.deviceId === deviceId,
  );
  if (!isDeviceValid) {
    throw new AppError(
      httpStatus.UNAUTHORIZED,
      'Session expired or device removed. Please login again.',
    );
  }

  // checking if the user is blocked
  const userStatus = user?.status;

  if (userStatus === USER_STATUS.BLOCKED) {
    throw new AppError(httpStatus.FORBIDDEN, 'This user is blocked!');
  }

  if (
    user.passwordChangedAt &&
    model.isJWTIssuedBeforePasswordChanged(
      user.passwordChangedAt,
      iat as number,
    )
  ) {
    throw new AppError(httpStatus.UNAUTHORIZED, 'You are not authorized!');
  }

  const jwtPayload = {
    userId: user?.userId,
    name: {
      firstName: user?.name?.firstName,
      lastName: user?.name?.lastName,
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
    accessToken,
  };
};

// submit approval request service
const submitForApproval = async (userId: string, currentUser: TCurrentUser) => {
  const { user: submittedUser } = await findUserById({
    userId,
  });
  if (!submittedUser) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }

  if (submittedUser?.status === 'SUBMITTED') {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'You have already submitted the approval request. Please wait for admin approval.',
    );
  }
  if (submittedUser?.status === 'APPROVED') {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Your account is already approved.',
    );
  }

  if (submittedUser?.role === 'DELIVERY_PARTNER') {
    if (
      currentUser?.role === 'FLEET_MANAGER' &&
      submittedUser?.registeredBy?.id.toString() !== currentUser._id.toString()
    ) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        'You do not have permission to submit approval request for this user',
      );
    }
  } else {
    if (submittedUser.userId !== currentUser.userId) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        'You do not have permission to submit approval request for this user',
      );
    }
  }

  const submissionTime = new Date();
  submittedUser.status = 'SUBMITTED';
  submittedUser.submittedForApprovalAt = submissionTime;
  submittedUser.isUpdateLocked = true;
  await submittedUser.save();

  // Prepare & send email to admin for user approval
  const emailHtml = await EmailHelper.createEmailContent(
    {
      userName: submittedUser.name?.firstName || 'User',
      userId: submittedUser.userId,
      currentYear: new Date().getFullYear(),
      userRole: submittedUser.role,
      date: new Date().toDateString(),
    },
    'user-approval-submission-notification',
  );

  try {
    await EmailHelper.sendEmail(
      submittedUser?.email,
      emailHtml,
      `New ${submittedUser?.role} Submission for Approval`,
    );
  } catch (err: any) {
    throw new AppError(httpStatus.INTERNAL_SERVER_ERROR, err.message);
  }

  const userName =
    `${submittedUser.name?.firstName || ''} ${submittedUser.name?.lastName || ''}`.trim() ||
    'A User';
  const formattedTime = submissionTime.toLocaleString('en-US', {
    hour: 'numeric',
    minute: 'numeric',
    hour12: true,
    day: 'numeric',
    month: 'short',
  });

  // send push notification to all admin
  NotificationService.sendToRole(
    'Admin',
    ['ADMIN', 'SUPER_ADMIN'],
    `New ${submittedUser?.role} Submission for Approval`,
    `${userName} (${submittedUser?.role}) has submitted for approval at ${formattedTime}.`,
    { userId: submittedUser?._id.toString(), role: submittedUser?.role },
    'default',
    'ACCOUNT',
  );

  return {
    message: `${submittedUser?.role} submitted for approval successfully`,
  };
};

// Active or Block User Service
const approvedOrRejectedUser = async (
  userId: string,
  payload: TApprovedRejectsPayload,
  currentUser: TCurrentUser,
) => {
  // --------------------------------------------------------------
  // Authorization & Validation
  // --------------------------------------------------------------
  if (userId === currentUser.userId) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'You cannot change your own status',
    );
  }

  const admin = await Admin.findOne({
    userId: currentUser.userId,
    isDeleted: false,
  });
  if (!admin) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Admin not found');
  }

  const { user: submittedUser } = await findUserById({
    userId,
  });

  if (!submittedUser) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }

  if (submittedUser.status === payload.status) {
    //
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `User is already ${payload.status.toLowerCase()}`,
    );
  }

  // --------------------------------------------------------------
  // Status Transition Rules
  // --------------------------------------------------------------
  if (
    (payload.status === 'REJECTED' || payload.status === 'BLOCKED') &&
    !payload.remarks
  ) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Remarks are required for ${payload.status.toLowerCase()}`,
    );
  }

  // --------------------------------------------------------------
  // Apply Status Changes
  // --------------------------------------------------------------
  submittedUser.status = payload.status;
  submittedUser.approvedOrRejectedOrBlockedAt = new Date();

  switch (payload.status) {
    case 'APPROVED':
      submittedUser.approvedBy = admin._id;
      submittedUser.remarks =
        payload.remarks ||
        'Congratulations! Your account has successfully met all the required criteria, and we’re excited to have you on board.';
      break;

    case 'REJECTED':
      submittedUser.rejectedBy = admin._id;
      submittedUser.remarks = payload.remarks!;
      submittedUser.isUpdateLocked = false;
      break;

    case 'BLOCKED':
      submittedUser.blockedBy = admin._id;
      submittedUser.remarks = payload.remarks!;
      break;
  }

  await submittedUser.save();
  // --------------------------------------------------------------
  // Push Notification (Non-blocking)
  // --------------------------------------------------------------
  const notificationTitleMap: Record<string, string> = {
    APPROVED: 'Your account has been approved',
    REJECTED: 'Your account has been rejected',
    BLOCKED: 'Your account has been blocked',
  };

  NotificationService.sendToUser(
    submittedUser.userId,
    notificationTitleMap[payload.status],
    submittedUser.remarks || '',
    {
      userId: submittedUser._id.toString(),
      role: submittedUser.role,
    },
    'default',
    'ACCOUNT',
  );

  // --------------------------------------------------------------
  // Email Notification (Non-blocking)
  // --------------------------------------------------------------
  const emailHtml = await EmailHelper.createEmailContent(
    {
      userName: submittedUser.name?.firstName || 'User',
      userRole: submittedUser.role,
      currentYear: new Date().getFullYear(),
      remarks: submittedUser.remarks || '',
      date: new Date().toDateString(),
      status: payload.status,
    },
    'user-approval-notification',
  );

  const emailSubject = `Your ${
    submittedUser.role
  } Application has been ${payload.status.toLowerCase()}`;

  if (
    [
      'ADMIN',
      'SUPER_ADMIN',
      'FLEET_MANAGER',
      'VENDOR',
      'DELIVERY_PARTNER',
      'SUB_VENDOR',
    ].includes(submittedUser.role) ||
    (submittedUser.role === 'CUSTOMER' && submittedUser.email)
  ) {
    try {
      await EmailHelper.sendEmail(submittedUser.email, emailHtml, emailSubject);
    } catch (err: any) {
      console.error('Email sending failed:', err);
    }
  }

  return {
    message: `${
      submittedUser.role
    } ${payload.status.toLowerCase()} successfully`,
  };
};

// Verify OTP
const verifyOtp = async (
  email?: string,
  contactNumber?: string,
  otp?: string,
  deviceDetails?: TLoginDevice,
  forceLogin?: boolean,
) => {
  if (!email && !contactNumber) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Email or contact number is required for OTP verification',
    );
  }

  let userData: any = undefined;
  let userModel: any = undefined;

  if (email) {
    const result = await findUserByEmail({ email });
    userData = result?.user;
    userModel = result?.model;
  } else if (contactNumber) {
    userData = await Customer.findOne({
      contactNumber,
      isDeleted: false,
    }).lean();
    userModel = Customer;
  }

  if (!userData || !userModel) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      'User not found. Please register.',
    );
  }

  const deviceLimit = ROLE_DEVICE_LIMITS[userData.role] || 3;
  const currentDeviceId = deviceDetails?.deviceId || 'unknown';

  const existingDeviceIndex = userData.loginDevices?.findIndex(
    (d: TLoginDevice) => d.deviceId === currentDeviceId,
  );
  const isExisting =
    existingDeviceIndex !== undefined && existingDeviceIndex > -1;

  if (!isExisting && (userData.loginDevices?.length || 0) >= deviceLimit) {
    if (!forceLogin) {
      throw new AppError(httpStatus.FORBIDDEN, 'LIMIT_EXCEEDED');
    }
  }

  if (email) {
    const redisOtpKey = `otp:${email}`;
    const storedOtp = await RedisService.get(redisOtpKey);

    if (email === config.customer.test_customer_email) {
      if (otp !== config.customer.test_customer_otp) {
        throw new AppError(httpStatus.UNAUTHORIZED, 'Invalid OTP');
      } else {
        console.log('Email otp verification bypassed for test customer');
      }
    } else if (!storedOtp || String(storedOtp) !== String(otp)) {
      throw new AppError(httpStatus.UNAUTHORIZED, 'Invalid or expired OTP');
    }

    await RedisService.del(redisOtpKey);
  } else if (contactNumber) {
    if (contactNumber === config.customer.test_customer_contact_number) {
      if (otp !== config.customer.test_customer_contact_otp) {
        throw new AppError(httpStatus.UNAUTHORIZED, 'Invalid OTP');
      } else {
        console.log('Contact otp verification bypassed for test customer');
      }
    } else {
      const res = await verifyMobileOtp(
        userData.mobileOtpId as string,
        otp as string,
      );

      if (!res?.data?.verified) {
        throw new AppError(httpStatus.UNAUTHORIZED, 'Invalid or expired OTP');
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
    $set: { isOtpVerified: true, requiresOtpVerification: false },
  };

  const options: any = { new: true };

  if (email) updateQuery.$set.isEmailVerified = true;

  if (isExisting) {
    updateQuery.$set['loginDevices.$[elem]'] = newDevice;
    options.arrayFilters = [{ 'elem.deviceId': newDevice.deviceId }];
  } else {
    if ((userData.loginDevices?.length || 0) >= deviceLimit) {
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

  await userModel.findOneAndUpdate({ _id: userData._id }, updateQuery, options);

  const jwtPayload = {
    userId: userData.userId,
    name: {
      firstName: userData.name.firstName || '',
      lastName: userData.name.lastName || '',
    },
    email: userData.email || '',
    contactNumber: userData.contactNumber || '',
    role: userData.role,
    status: userData.status,
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
    message: email
      ? `${userData.role} email verified successfully`
      : 'Customer contact number verified successfully',
    accessToken,
    refreshToken,
  };
};

// Resend OTP
const resendOtp = async (email?: string, contactNumber?: string) => {
  if (!email && !contactNumber) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Email or contact number is required to resend OTP',
    );
  }
  let user;
  if (contactNumber) {
    user = await Customer.findOne({ contactNumber, isDeleted: false });
    if (!user) {
      throw new AppError(
        httpStatus.NOT_FOUND,
        'User not found. Please register.',
      );
    }
    const id = user.mobileOtpId;
    if (!id) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'No OTP found to resend. Please request a new OTP.',
      );
    }
    await resendMobileOtp(id as string);
    user.isOtpVerified = false;
    user.requiresOtpVerification = true;
    await user.save();
  }
  if (email) {
    const result = await findUserByEmail({ email });
    user = result?.user;
    if (!user) {
      throw new AppError(
        httpStatus.NOT_FOUND,
        'User not found. Please register.',
      );
    }

    if (user?.isEmailVerified) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'User is already verified. Please login.',
      );
    }
    const { otp } = generateOtp();

    const redisOtpKey = `otp:${email}`;
    await RedisService.set(redisOtpKey, otp, 300); // 5-minute TTL

    // Prepare email template content
    const emailHtml = await EmailHelper.createEmailContent(
      {
        otp,
        userEmail: user?.email,
        currentYear: new Date().getFullYear(),
        date: new Date().toDateString(),
        user: user?.name?.firstName || user?.role.toLocaleLowerCase(),
      },
      'verify-email',
    );

    // Send verification email
    try {
      await EmailHelper.sendEmail(
        email,
        emailHtml,
        'Verify your email for DeliGo',
      );
    } catch (err: any) {
      throw new AppError(httpStatus.INTERNAL_SERVER_ERROR, err.message);
    }
  }
  return {
    message: 'OTP resent successfully. Please check your email.',
  };
};

// soft delete user service
const softDeleteUser = async (userId: string, currentUser: TCurrentUser) => {
  if (currentUser.status !== 'APPROVED') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      `You are not approved to delete a user. Your account is ${currentUser.status}`,
    );
  }

  const { user: existingUser } = await findUserById({
    userId,
  });
  if (!existingUser) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found!');
  }

  if (
    (currentUser?.role === 'DELIVERY_PARTNER',
    currentUser?.role === 'CUSTOMER',
    currentUser?.role === 'VENDOR',
    currentUser?.role === 'FLEET_MANAGER')
  ) {
    if (currentUser?.userId !== existingUser?.userId) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        'You do not have permission to delete this user!',
      );
    }
  }

  if (
    currentUser?.role === 'FLEET_MANAGER' &&
    existingUser?.role === 'DELIVERY_PARTNER'
  ) {
    if (
      currentUser?._id.toString() !== existingUser?.registeredBy.id.toString()
    ) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        'You do not have permission to delete this user!',
      );
    }
  }

  if (existingUser.role === USER_ROLE.SUPER_ADMIN) {
    throw new AppError(httpStatus.FORBIDDEN, 'Cannot delete Super Admin user!');
  }

  existingUser.isDeleted = true;
  await existingUser.save();

  return {
    message: `${existingUser?.role} deleted successfully`,
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
      `You are not approved to delete a user. Your account is ${currentUser.status}`,
    );
  }

  const { user: existingUser, model } = await findUserById({
    userId,
    isDeleted: true,
  });
  if (!existingUser) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      'User already permanently deleted!',
    );
  }

  if (!existingUser.isDeleted) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'User should be soft deleted first!',
    );
  }

  if (existingUser.role === USER_ROLE.SUPER_ADMIN) {
    throw new AppError(httpStatus.FORBIDDEN, 'Cannot delete Super Admin user!');
  }
  await model?.deleteOne({ userId: existingUser.userId });

  return {
    message: `${existingUser?.role} permanently deleted successfully`,
  };
};

export const AuthServices = {
  registerUser,
  onboardUser,
  loginUser,
  loginCustomer,
  updateFcmToken,
  logoutUser,
  changePassword,
  forgotPassword,
  resetPassword,
  refreshToken,
  resendOtp,
  verifyOtp,
  approvedOrRejectedUser,
  submitForApproval,
  softDeleteUser,
  permanentDeleteUser,
};
