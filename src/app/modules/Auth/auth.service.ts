/* eslint-disable @typescript-eslint/no-explicit-any */
import httpStatus from 'http-status';
import AppError from '../../errors/AppError';
import generateUserId, { USER_TYPE_MAP } from '../../utils/generateUserId';
import generateOtp from '../../utils/generateOtp';
import { Model } from 'mongoose';
import bcryptjs from 'bcryptjs';
import {
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
import { TLoginCustomer, TLoginUser, TRegisterUser } from './auth.interface';
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
const registerUser = async (payload: TRegisterUser) => {
  const { email, role, password } = payload;
  const modelData = ROLE_COLLECTION_MAP[role as TUserRole];
  if (!modelData) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Invalid registration path');
  }

  const mongooseModel = mongoose.model(modelData);

  // Generate userId & OTP
  const userId = generateUserId(role as TUserRole);
  const { otp } = generateOtp();

  const existingUser = await AuthUser.findOne({
    email,
  }).select(
    'email role status profileId _id isEmailVerified isContactNumberVerified',
  );

  const emailHtml = await EmailHelper.createEmailContent(
    {
      otp,
      userEmail: email,
      currentYear: new Date().getFullYear(),
      date: new Date().toDateString(),
      user: role.toLocaleLowerCase(),
    },
    'verify-email',
  );

  const session = await mongoose.startSession();
  session.startTransaction();

  let createdUser: any = null;
  try {
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
        await prevModel.deleteOne({ _id: existingUser.profileId }, { session });
      }

      await AuthUser.deleteOne({ _id: existingUser._id }, { session });
    }
    const result = await mongooseModel.create(
      [
        {
          email,
          userId,
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
          profileModel: modelData,
          email: email,
          password,
          role: role,
          status: 'PENDING',
          isDeleted: false,
        },
      ],
      { session },
    );

    const redisOtpKey = `otp:${role.toLowerCase()}:${payload.email}`;
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
        'The email already exists for this role. Please use another email.',
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
      userId,
      email: payload.email,
      role: payload.role,
      status: 'PENDING',
    },
  };
};

const onboardUser = async (
  payload: TRegisterUser,
  currentUser: TCurrentUser,
) => {
  const { email, role, password } = payload;
  const modelData = ROLE_COLLECTION_MAP[role as TUserRole];

  if (!modelData) {
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

  const allowedRoles = ROLE_ONBOARD_PERMISSIONS[role.toLowerCase()];

  if (allowedRoles && !allowedRoles.includes(currentUser.role)) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      `You do not have permission to onboard a ${role.replace('-', ' ')}`,
    );
  }

  const mongooseModel = mongoose.model(modelData);

  const userId = generateUserId(role as TUserRole);
  const { otp } = generateOtp();

  const existingUser = await AuthUser.findOne({ email });

  let registeredByValue: any;
  if (
    ['vendor', 'sub-vendor', 'delivery-partner'].includes(role.toLowerCase())
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

    const result = await mongooseModel.create(
      [
        {
          email,
          userId,
          registeredBy: registeredByValue,
          status: 'PENDING',
          role: role,
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
          email,
          password,
          role: role,
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

  const redisOtpKey = `otp:${role.toLowerCase()}:${email}`;
  await RedisService.set(redisOtpKey, otp, 300);

  const emailHtml = await EmailHelper.createEmailContent(
    {
      otp,
      userEmail: email,
      currentYear: new Date().getFullYear(),
      date: new Date().toDateString(),
      user: role.toLowerCase(),
    },
    'verify-email',
  );

  EmailHelper.sendEmail(email, emailHtml, 'Verify your email for DeliGo').catch(
    (err) => console.error('Email sending failed:', err),
  );

  return {
    message: `${role} onboarded successfully. Verification email sent to ${email}`,
    data: {
      email,
      role: role,
      status: 'PENDING',
      userId,
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
  });
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }

  if (user?.isDeleted) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      'Your account is deleted. Please contact support.',
    );
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
    .select('role status profileId isEmailVerified');

  console.log(user);

  const populatedUser = user?.profileId as any;

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'This user is not found!');
  }

  if (!user.isEmailVerified) {
    throw new AppError(httpStatus.FORBIDDEN, 'You need to verify your email');
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

  const user = await AuthUser.findOne({
    userId,
    isDeleted: false,
  }).populate('profileId', 'userId name');

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'This user is not found!');
  }
  const userProfile = user?.profileId as any;

  const targetDeviceSession = user.loginDevices?.find(
    (d: any) => d.deviceId === deviceId,
  );

  if (!targetDeviceSession || targetDeviceSession.isLoggedIn === false) {
    throw new AppError(
      httpStatus.UNAUTHORIZED,
      'Your session has expired or you have logged out from this device. Please log in again.',
    );
  }

  // checking if the user is blocked
  const userStatus = user?.status;

  if (userStatus === USER_STATUS.BLOCKED) {
    throw new AppError(httpStatus.FORBIDDEN, 'This user is blocked!');
  }

  if (
    user.passwordChangedAt &&
    AuthUser.isJWTIssuedBeforePasswordChanged(
      user.passwordChangedAt,
      iat as number,
    )
  ) {
    throw new AppError(httpStatus.UNAUTHORIZED, 'You are not authorized!');
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
    accessToken,
  };
};

// submit approval request service
const submitForApproval = async (userId: string, currentUser: TCurrentUser) => {
  const authUser = await AuthUser.findOne({ userId });
  if (!authUser || authUser.isDeleted) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }

  if (authUser?.status === 'SUBMITTED') {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'You have already submitted the approval request. Please wait for admin approval.',
    );
  }
  if (authUser?.status === 'APPROVED') {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Your account is already approved.',
    );
  }

  const modelName = ROLE_COLLECTION_MAP[authUser.role as TUserRole];
  if (!modelName) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Invalid user role mapping');
  }

  const TargetModel = mongoose.model(modelName) as unknown as Model<any>;
  const submittedProfile = await TargetModel.findById(authUser.profileId);

  if (!submittedProfile) {
    throw new AppError(httpStatus.NOT_FOUND, 'User profile details not found');
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
          'You do not have permission to submit approval requests for this delivery partner.',
        );
      }

      if (!isFleetManager && authUser.userId !== currentUser.userId) {
        throw new AppError(
          httpStatus.FORBIDDEN,
          'You can only submit approval requests for your own profile.',
        );
      }
    } else {
      if (authUser.userId !== currentUser.userId) {
        throw new AppError(
          httpStatus.FORBIDDEN,
          'You do not have permission to initiate this approval request.',
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
      'Failed to lock profile and submit approval request. Please try again.',
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
        'Admin',
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
    message: `${authUser?.role} submitted for approval successfully`,
  };
};

// Active or Block User Service
const approvedOrRejectedUser = async (
  userId: string,
  payload: TApprovedRejectsPayload,
  currentUser: TCurrentUser,
) => {
  if (userId === currentUser.userId) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'You cannot change your own status',
    );
  }

  const adminUser = await AuthUser.findOne({
    userId: currentUser.userId,
    isDeleted: false,
  });

  if (!adminUser || !['ADMIN', 'SUPER_ADMIN'].includes(adminUser.role)) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'Admin not found or unauthorized for this action',
    );
  }

  const authUser = await AuthUser.findOne({
    userId: userId,
    isDeleted: false,
  });

  if (!authUser) {
    throw new AppError(httpStatus.NOT_FOUND, 'Target user not found');
  }

  const role = authUser.role as TUserRole;
  const targetAuthStatus = payload.status;

  if (authUser.status === targetAuthStatus) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `User is already ${targetAuthStatus.toLowerCase()}`,
    );
  }

  if (
    (targetAuthStatus === 'REJECTED' || targetAuthStatus === 'BLOCKED') &&
    !payload.remarks?.trim()
  ) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Remarks are required for ${targetAuthStatus.toLowerCase()}`,
    );
  }

  const modelName = ROLE_COLLECTION_MAP[role];
  if (!modelName) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Invalid user role mapping');
  }

  const TargetModel = mongoose.model(modelName) as unknown as Model<any>;
  const submittedProfile = await TargetModel.findById(authUser.profileId);

  if (!submittedProfile) {
    throw new AppError(httpStatus.NOT_FOUND, 'User profile details not found');
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
      'Failed to update user approval status due to transaction error',
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
    message: `${role} account has been ${targetAuthStatus.toLowerCase()} successfully`,
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
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Email or contact number is required for OTP verification',
    );
  }

  console.log(role);

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
    throw new AppError(
      httpStatus.NOT_FOUND,
      'User not found. Please register.',
    );
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
    message: email
      ? `${userData.role} email verified successfully`
      : 'Customer contact number verified successfully',
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
      'Email or contact number is required to resend OTP',
    );
  }

  let successMessage = 'OTP resent successfully.';

  if (contactNumber) {
    const user = await AuthUser.findOne({
      role: 'CUSTOMER',
      contactNumber: contactNumber.trim(),
      isDeleted: false,
    });

    if (!user) {
      throw new AppError(
        httpStatus.NOT_FOUND,
        'User not found with this contact number. Please register first.',
      );
    }

    const id = user.mobileOtpId;
    if (!id) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'No active OTP session found to resend. Please request a new login.',
      );
    }

    await resendMobileOtp(id as string);

    user.requiresOtpVerification = true;
    await user.save();

    successMessage =
      'OTP resent successfully to your mobile number. Please check your SMS.';
  }

  if (email) {
    const formattedEmail = email.trim().toLowerCase();
    const user = await AuthUser.findOne({
      role: role,
      email: email.trim().toLowerCase(),
      isDeleted: false,
    }).populate('profileId', 'userId name');

    if (!user) {
      throw new AppError(
        httpStatus.NOT_FOUND,
        'User not found with this email address. Please register first.',
      );
    }

    if (user.isEmailVerified) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'Your email is already verified. Please proceed to login.',
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

    successMessage =
      'OTP resent successfully. Please check your email inbox or spam folder.';
  }

  return {
    success: true,
    message: successMessage,
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

  const targetAuthUser = await AuthUser.findOne({ userId, isDeleted: false });
  if (!targetAuthUser) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      'User not found or already deleted!',
    );
  }

  if (targetAuthUser.role === USER_ROLE.SUPER_ADMIN) {
    throw new AppError(httpStatus.FORBIDDEN, 'Cannot delete Super Admin user!');
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
      throw new AppError(
        httpStatus.FORBIDDEN,
        'You do not have permission to delete this user account!',
      );
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
        throw new AppError(
          httpStatus.FORBIDDEN,
          'You can only delete delivery partners registered under your fleet management!',
        );
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
      'Failed to execute soft delete due to transaction rollback',
    );
  }

  return {
    success: true,
    message: `${targetAuthUser.role} account and profile deleted successfully`,
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
      `You are not approved to perform permanent deletion. Your account is ${currentUser.status}`,
    );
  }

  const targetAuthUser = await AuthUser.findOne({ userId });
  if (!targetAuthUser) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      'User account not found or already permanently deleted!',
    );
  }
  if (targetAuthUser.role === USER_ROLE.SUPER_ADMIN) {
    throw new AppError(httpStatus.FORBIDDEN, 'Cannot delete Super Admin user!');
  }

  if (!targetAuthUser.isDeleted) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'User must be soft-deleted first before performing permanent deletion!',
    );
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
      'Failed to execute permanent deletion due to transaction rollback',
    );
  }

  return {
    success: true,
    message: `${targetAuthUser.role} account and profile permanently purged from DeliGo systems.`,
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
