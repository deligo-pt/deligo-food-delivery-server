/* eslint-disable no-unused-vars */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import httpStatus from 'http-status';
import AppError from '../../errors/AppError';
import generateUserId, { USER_TYPE_MAP } from '../../utils/generateUserId';
import generateOtp from '../../utils/generateOtp';
import { Model } from 'mongoose';
import bcryptjs from 'bcryptjs';
import {
  ALL_USER_MODELS,
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
import { NotificationService } from '../Notification/notification.service';
import mongoose from 'mongoose';
import { RedisService } from '../../config/redis';
import { ReferralServices } from '../Referral/referral.service';
import { AuthUser } from '../AuthUser/authUser.model';
import { TLoginDevice } from '../../constant/GlobalInterface/user.interface';
import { TAuthUser } from '../AuthUser/authUser.interface';

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
    if (existingUser.status === 'APPROVED') {
      throw new AppError(
        httpStatus.CONFLICT,
        `${existingUser.email} is already registered as ${existingUser.role}.`,
      );
    }
    const prevModelData =
      ROLE_COLLECTION_MAP[existingUser.role as keyof typeof USER_ROLE];
    if (prevModelData) {
      const prevModel = mongoose.model(prevModelData);
      await prevModel.deleteOne({ _id: existingUser.userObjectId });
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
        },
      ],
      { session },
    );
    createdUser = result[0];

    await AuthUser.create(
      [
        {
          userAuthId: `AUTH-${userId}`,
          userObjectId: createdUser._id,
          onModel: TargetModel.modelName,
          userId,
          email: payload.email,
          password: rawPassword,
          role: payload.role,
          status: 'PENDING',
          permissions: [],
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
  currentUser: TAuthUser,
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

  const rolePermissions: Record<string, TUserRole[]> = {
    'delivery-partner': ['ADMIN', 'SUPER_ADMIN', 'FLEET_MANAGER'],
    'sub-vendor': ['ADMIN', 'SUPER_ADMIN', 'VENDOR'],
    'fleet-manager': ['ADMIN', 'SUPER_ADMIN'],
    vendor: ['ADMIN', 'SUPER_ADMIN'],
    customer: ['ADMIN', 'SUPER_ADMIN'],
    admin: ['SUPER_ADMIN'],
  };

  const allowedRoles = rolePermissions[targetRole.toLowerCase()];

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

  const existingUser = await AuthUser.findOne({ email: payload.email }).select(
    'email role status userObjectId _id',
  );

  if (existingUser) {
    if (existingUser.status === 'APPROVED') {
      throw new AppError(
        httpStatus.CONFLICT,
        `${existingUser.email} is already registered as ${existingUser.role}.`,
      );
    } else {
      const modelName =
        ROLE_COLLECTION_MAP[existingUser.role as keyof typeof USER_ROLE];
      if (modelName) {
        const OldProfileModel = mongoose.model(
          modelName,
        ) as unknown as Model<any>;
        await OldProfileModel.deleteOne({ _id: existingUser.userObjectId });
      }
      await AuthUser.deleteOne({ _id: existingUser._id });
    }
  }

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

  const rawPassword = payload.password;
  const { password: _, ...profilePayload } = payload;

  const onboardingRole = targetRole.toLowerCase();

  const session = await mongoose.startSession();
  session.startTransaction();

  let createdUser;
  try {
    const result = await mongooseModel.create(
      [
        {
          ...profilePayload,
          [idField]: userId,
          registeredBy: currentUser._id,
          isEmailVerified: false,
          status: 'PENDING',
        },
      ],
      { session },
    );
    createdUser = result[0];

    await AuthUser.create(
      [
        {
          userAuthId: `AUTH-${userId}`,
          userObjectId: createdUser._id,
          onModel: TargetModel.modelName,
          userId,
          email: payload.email,
          password: rawPassword,
          role: payload.role,
          status: 'PENDING',
          permissions: [],
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
    console.log(err);
    await session.abortTransaction();
    session.endSession();

    if (err?.code === 11000)
      throw new AppError(
        httpStatus.CONFLICT,
        'User Id or Email already exists',
      );
    throw err;
  }

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
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Password or Model information missing',
    );
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
    if (loginDevices?.length >= deviceLimit) {
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

  const targetModelName =
    ROLE_COLLECTION_MAP[user.role as keyof typeof USER_ROLE];
  let populatedUser: any = null;

  if (targetModelName) {
    populatedUser = await AuthUser.findById(user._id)
      .select('userObjectId email userId role status contactNumber')
      .populate({
        path: 'userObjectId',
        model: targetModelName,
        select: 'name',
      });
  } else {
    populatedUser = await AuthUser.findById(user._id).select(
      'userObjectId email userId role status contactNumber',
    );
  }

  const profileDetails = populatedUser?.userObjectId as any;

  //create token and sent to the  client
  const jwtPayload = {
    userId: populatedUser?.userId,
    name: {
      firstName: profileDetails?.name?.firstName || '',
      lastName: profileDetails?.name?.lastName || '',
    },
    email: populatedUser?.email,
    contactNumber: populatedUser?.contactNumber,
    role: populatedUser?.role,
    status: populatedUser?.status,
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

  // -----------------------------------------------------
  // Validate input
  // -----------------------------------------------------
  if (!email && !contactNumber) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Email or contact number is required',
    );
  }

  // Helper with internal error handling
  const handleReferral = async (user: any, code?: string) => {
    if (!code) return;
    const res = await ReferralServices.createReferralEntry(user, code);
    if (res?.referrerId) {
      await Customer.findByIdAndUpdate(user._id, {
        referredBy: res.referrerId,
      });
    }
  };

  // -----------------------------------------------------
  // 2. Global Role Cross-Checking Helper
  // -----------------------------------------------------
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

  // -----------------------------------------------------
  // Email Login Logic
  // -----------------------------------------------------
  if (email) {
    await verifyNoRoleConflict('email', email);

    // Fetch existing customer by email
    const existingUser = await AuthUser.findOne({
      email,
    })
      .populate('userObjectId', 'referredBy')
      .lean();

    const existingCustomer = existingUser?.userObjectId as any;

    // Prevent returning users from using referral codes
    if (existingCustomer?.referredBy && referralCode) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'You have already been referred by someone. Please login using your email/contact number to use the referral code.',
      );
    }

    // Generate OTP
    const { otp } = generateOtp();
    const redisOtpKey = `otp:${payload.email}`;
    await RedisService.set(redisOtpKey, otp, 300); // Store OTP in Redis with 5 minutes expiration

    if (!existingUser) {
      const userId = generateUserId('/create-customer');
      const userAuthId = `AUTH-${userId}`;

      const newUser = await Customer.create({
        userId,
        status: USER_STATUS.PENDING,
      });

      await AuthUser.create({
        userAuthId,
        userId,
        userObjectId: newUser._id,
        onModel: 'Customer',
        email,
        role: USER_ROLE.CUSTOMER,
        status: USER_STATUS.PENDING,
        requiresOtpVerification: true,
      });
      await handleReferral(newUser, referralCode);
    } else {
      if (!existingCustomer.referredBy && referralCode) {
        await handleReferral(existingCustomer, referralCode);
      }
      await AuthUser.updateOne(
        { userObjectId: existingCustomer._id },
        { requiresOtpVerification: true },
      );
    }

    const emailHtml = await EmailHelper.createEmailContent(
      {
        otp,
        userEmail: payload.email,
        currentYear: new Date().getFullYear(),
        date: new Date().toDateString(),
        user: existingCustomer?.name?.firstName || 'Customer',
      },
      'verify-email',
    );
    EmailHelper.sendEmail(
      payload.email,
      emailHtml,
      'Verify your email for DeliGo',
    ).catch((err) => console.error('Email send failed:', err));

    return { message: 'OTP sent to your email. Please verify to login.' };
  }

  // -----------------------------------------------------
  // Mobile Login Logic
  // -----------------------------------------------------
  if (contactNumber) {
    await verifyNoRoleConflict('contactNumber', contactNumber);
    // Fetch existing customer by mobile number
    const existingUser = await AuthUser.findOne({
      contactNumber,
    })
      .populate('userObjectId', 'referredBy')
      .lean();

    const existingCustomer = existingUser?.userObjectId as any;

    if (existingCustomer?.referredBy && referralCode) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'You have already been referred by someone. Please login using your email/contact number to use the referral code.',
      );
    }

    const isTestNumber =
      contactNumber ===
      (config.customer.test_customer_contact_number as string);

    // Send mobile OTP
    const res = await sendMobileOtp(contactNumber);
    const mobileOtpId = isTestNumber ? 'test-otp-id' : res.data.id;

    if (existingUser) {
      if (!existingCustomer.referredBy && referralCode) {
        await handleReferral(existingCustomer, referralCode);
      }
      await AuthUser.updateOne(
        { userObjectId: existingCustomer._id },
        {
          mobileOtpId,
          requiresOtpVerification: true,
        },
      );
    } else {
      const userId = generateUserId('/create-customer');
      const userAuthId = `AUTH-${userId}`;
      const newUser = await Customer.create({
        userId,
        status: USER_STATUS.PENDING,
      });

      await AuthUser.create({
        userAuthId,
        userId,
        userObjectId: newUser._id,
        onModel: 'Customer',
        contactNumber,
        role: USER_ROLE.CUSTOMER,
        status: USER_STATUS.PENDING,
        requiresOtpVerification: true,
        mobileOtpId,
      });

      await handleReferral(newUser, referralCode);
    }

    return {
      message: 'OTP sent to your mobile number. Please verify to login.',
    };
  }
};

//update FCM Token
const updateFcmToken = async (
  currentUser: TAuthUser,
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
    { _id: currentUser._id, 'loginDevices.deviceId': deviceId },
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
const logoutUser = async (currentUser: TAuthUser, deviceId: string) => {
  if (!deviceId?.trim()) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Device ID is required for logout',
    );
  }

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
    { _id: currentUser._id },
    updatePipeline,
    { new: true },
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
  currentUser: TAuthUser,
  payload: { oldPassword: string; newPassword: string },
) => {
  if (payload.oldPassword === payload.newPassword) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'New password must be different from old password',
    );
  }

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
  const user = await AuthUser.findOne({ email, isDeleted: false }).populate(
    'userObjectId',
    'name email userId',
  );

  const populatedUser = user?.userObjectId as any;

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
  if (!email?.trim() || !token?.trim() || !newPassword?.trim()) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Email, token and password are required',
    );
  }

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
  console.log(newPassword);

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
const submitForApproval = async (userId: string, currentUser: TAuthUser) => {
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

  const modelName =
    ROLE_COLLECTION_MAP[authUser.role as keyof typeof USER_ROLE];
  if (!modelName) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Invalid user role mapping');
  }

  const TargetModel = mongoose.model(modelName) as unknown as Model<any>;
  const submittedProfile = await TargetModel.findById(authUser.userObjectId);

  if (!submittedProfile) {
    throw new AppError(httpStatus.NOT_FOUND, 'User profile details not found');
  }

  const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(currentUser.role);

  if (!isAdmin) {
    if (authUser?.role === 'DELIVERY_PARTNER') {
      if (
        currentUser?.role === 'FLEET_MANAGER' &&
        submittedProfile?.registeredBy?.toString() !==
          currentUser._id.toString()
      ) {
        throw new AppError(
          httpStatus.FORBIDDEN,
          'You do not have permission to submit approval request for this user',
        );
      }
    } else {
      if (authUser.userId !== currentUser.userId) {
        throw new AppError(
          httpStatus.FORBIDDEN,
          'You do not have permission to submit approval request for this user',
        );
      }
    }
  }

  const submissionTime = new Date();

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    authUser.status = 'SUBMITTED';
    authUser.submittedForApprovalAt = submissionTime;
    await authUser.save({ session });

    submittedProfile.isUpdateLocked = true;
    await submittedProfile.save({ session });

    await session.commitTransaction();
    session.endSession();
  } catch (error: any) {
    await session.abortTransaction();
    session.endSession();
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Failed to submit approval request',
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
      await NotificationService.sendToRole(
        'Admin',
        ['ADMIN', 'SUPER_ADMIN'],
        `New ${authUser?.role} Submission for Approval`,
        `${userName} (${authUser?.role}) has submitted for approval at ${formattedTime}.`,
        { userObjectId: authUser?._id.toString(), role: authUser?.role },
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
  currentUser: TAuthUser,
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
  const submittedProfile = await TargetModel.findById(authUser.userObjectId);

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
  authUser.remarks = finalRemarks;
  authUser.approvedOrRejectedOrBlockedAt = actionTimestamp;

  switch (targetAuthStatus) {
    case 'APPROVED':
      authUser.approvedBy = adminUser._id;
      authUser.rejectedBy = undefined;
      authUser.blockedBy = undefined;
      break;

    case 'REJECTED':
      authUser.rejectedBy = adminUser._id;
      authUser.approvedBy = undefined;
      authUser.blockedBy = undefined;

      submittedProfile.isUpdateLocked = false;
      break;

    case 'BLOCKED':
      authUser.blockedBy = adminUser._id;
      authUser.approvedBy = undefined;
      authUser.rejectedBy = undefined;
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
          userObjectId: authUser.userObjectId.toString(),
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

  if (email) {
    userData = await AuthUser.isUserExistsByEmail(email);
  } else if (contactNumber) {
    userData = await AuthUser.findOne({
      contactNumber,
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

  const targetModelName =
    ROLE_COLLECTION_MAP[userData.role as keyof typeof USER_ROLE];
  let populatedAuthUser: any = null;

  if (targetModelName) {
    populatedAuthUser = await AuthUser.findById(userData._id).populate({
      path: 'userObjectId',
      model: targetModelName,
    });
  } else {
    populatedAuthUser = await AuthUser.findById(userData._id);
  }

  const profileDetails = populatedAuthUser?.userObjectId as any;

  const jwtPayload = {
    userId: populatedAuthUser?.userId,
    name: {
      firstName: profileDetails?.name?.firstName || '',
      lastName: profileDetails?.name?.lastName || '',
    },
    email: populatedAuthUser?.email || '',
    contactNumber: populatedAuthUser?.contactNumber || '',
    role: populatedAuthUser?.role,
    status: populatedAuthUser?.status,
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
const softDeleteUser = async (userId: string, currentUser: TAuthUser) => {
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
const permanentDeleteUser = async (userId: string, currentUser: TAuthUser) => {
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
