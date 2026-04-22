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
  AuthUser,
  ROLE_COLLECTION_MAP,
  ROLE_DEVICE_LIMITS,
  TLoginDevice,
  TUserRole,
  USER_ROLE,
  USER_STATUS,
} from '../../constant/user.constant';
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
import { generateReferralCode } from '../../utils/generateReferralCode';
import { LoyaltyServices } from '../Loyalty/loyalty.service';

// Register User [Vendor, Fleet Manager, Admin]
const registerUser = async <
  T extends {
    email: string;
    role: TUserRole;
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

  const { Model, idField } = modelData;
  const mongooseModel = Model as unknown as Model<T>;

  // Generate userId & OTP
  const userID = generateUserId(userType);
  payload.role = userTypeData.role;
  const { otp } = generateOtp();

  const checkUserPromise = Promise.all(
    ALL_USER_MODELS.map((M: any) =>
      M.isUserExistsByEmail(
        payload.email,
        false,
        'email isEmailVerified role',
      ).catch(() => null),
    ),
  );

  const emailContentPromise = EmailHelper.createEmailContent(
    {
      otp,
      userEmail: payload.email,
      currentYear: new Date().getFullYear(),
      date: new Date().toDateString(),
      user: payload?.role.toLocaleLowerCase(),
    },
    'verify-email',
  );

  const [checkUserResults, emailHtml] = await Promise.all([
    checkUserPromise,
    emailContentPromise,
  ]);

  const existingUser = checkUserResults.find((user) => user && user.email);
  if (existingUser) {
    if (existingUser.isEmailVerified) {
      throw new AppError(
        httpStatus.CONFLICT,
        `${existingUser.email} is already registered as ${existingUser.role}.`,
      );
    }
    const index = checkUserResults.findIndex(
      (user) => user?.email === existingUser.email,
    );
    await ALL_USER_MODELS[index].deleteOne({ email: existingUser.email });
  }

  let createdUser: any = null;
  try {
    const result = await mongooseModel.create([
      {
        ...payload,
        [idField]: userID,
      },
    ]);
    createdUser = result[0];

    const redisOtpKey = `otp:${payload.email}`;
    await RedisService.set(redisOtpKey, otp, 300); // Store OTP in Redis with 5 minutes expiration
  } catch (err: any) {
    if (err?.code === 11000)
      throw new AppError(httpStatus.CONFLICT, 'Email already in use');
    throw err;
  }

  // send email
  EmailHelper.sendEmail(
    payload.email,
    emailHtml,
    'Verify your email for DeliGo',
  ).catch((err) => console.error('Email sending failed:', err));

  return {
    message: `${payload.role} registered. Check your email for OTP.`,
    data: createdUser,
  };
};

const onboardUser = async <
  T extends {
    email: string;
    role: TUserRole;
    isEmailVerified?: boolean;
    registeredBy?: any;
  },
>(
  payload: T,
  targetRole: string,
  currentUser: AuthUser,
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

  const { Model, idField } = modelData;
  const mongooseModel = Model as unknown as Model<T>;

  const userID = generateUserId(mapKey);
  payload.role = userTypeData.role;
  const { otp } = generateOtp();

  // const checkModels = ALL_USER_MODELS.map((M: any) =>
  //   M.isUserExistsByEmail(payload.email).catch(() => null),
  // );
  // const checkResults = await Promise.all(checkModels);

  const checkUserPromise = Promise.all(
    ALL_USER_MODELS.map((M: any) =>
      M.isUserExistsByEmail(
        payload.email,
        false,
        'email isEmailVerified role',
      ).catch(() => null),
    ),
  );

  const emailContentPromise = await EmailHelper.createEmailContent(
    {
      otp,
      userEmail: payload.email,
      currentYear: new Date().getFullYear(),
      date: new Date().toDateString(),
      user: payload.role.toLowerCase(),
    },
    'verify-email',
  );

  const [checkResults, emailHtml] = await Promise.all([
    checkUserPromise,
    emailContentPromise,
  ]);

  const existingUser = checkResults.find((user) => user && user.email);

  if (existingUser) {
    if (existingUser.isEmailVerified) {
      throw new AppError(
        httpStatus.CONFLICT,
        `${existingUser.email} is already registered as ${existingUser.role}.`,
      );
    } else {
      const index = checkResults.findIndex(
        (u) => u?.email === existingUser.email,
      );
      await ALL_USER_MODELS[index].deleteOne({ email: existingUser.email });
    }
  }

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

  let createdUser;
  try {
    const result = await mongooseModel.create([
      {
        ...payload,
        [idField]: userID,
        registeredBy: registeredByValue,
        isEmailVerified: false,
        status: USER_STATUS.PENDING,
      },
    ]);
    createdUser = result[0];
    const redisOtpKey = `otp:${payload.email}`;
    await RedisService.set(redisOtpKey, otp, 300);
  } catch (err: any) {
    if (err?.code === 11000)
      throw new AppError(
        httpStatus.CONFLICT,
        'User ID or Email already exists',
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
    data: createdUser,
  };
};

// Login User
const loginUser = async (
  payload: TLoginUser & { deviceDetails?: TLoginDevice; forceLogin?: boolean },
) => {
  // checking if the user is exist
  const { user, model } = await findUserByEmail({
    email: payload?.email,
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

  if (!payload.password || !model) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Password or Model information missing',
    );
  }

  //checking if the password is correct
  const isPasswordMatched = await model.isPasswordMatched(
    payload.password,
    user.password,
  );

  if (!isPasswordMatched) {
    throw new AppError(httpStatus.UNAUTHORIZED, 'Password did not match');
  }

  const deviceLimit = ROLE_DEVICE_LIMITS[user.role] || 3;

  const newDevice: TLoginDevice = {
    deviceId: payload.deviceDetails?.deviceId || 'unknown',
    deviceType: payload.deviceDetails?.deviceType || 'unknown',
    deviceName: payload.deviceDetails?.deviceName || '',
    userAgent: payload.deviceDetails?.userAgent || '',
    ip: payload.deviceDetails?.ip || '',
    isVerified: true,
    lastLogin: new Date(),
  };

  const existingDeviceIndex = user.loginDevices?.findIndex(
    (device: TLoginDevice) => device.deviceId === newDevice.deviceId,
  );
  const isSameDevice = existingDeviceIndex > -1;

  if (!isSameDevice && user.loginDevices?.length >= deviceLimit) {
    if (!payload.forceLogin) {
      throw new AppError(httpStatus.FORBIDDEN, 'LIMIT_EXCEEDED');
    }
  }

  let updateQuery: any;

  if (isSameDevice) {
    updateQuery = {
      $set: { [`loginDevices.${existingDeviceIndex}`]: newDevice },
    };
  } else if (payload.forceLogin && user.loginDevices?.length >= deviceLimit) {
    if (deviceLimit === 1) {
      updateQuery = { $set: { loginDevices: [newDevice] } };
    } else {
      await model.findOneAndUpdate(
        { _id: user._id },
        { $pop: { loginDevices: -1 } },
      );
      updateQuery = { $push: { loginDevices: newDevice } };
    }
  } else {
    updateQuery = { $push: { loginDevices: newDevice } };
  }

  await model.findOneAndUpdate({ _id: user._id }, updateQuery, { new: true });
  //create token and sent to the  client
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
  // -----------------------------------------------------
  // Validate input
  // -----------------------------------------------------
  if (!payload?.email && !payload?.contactNumber) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Email or contact number is required',
    );
  }

  // Validate referral code if provided
  let referrerId = null;
  if (payload.referralCode) {
    const referrer = await Customer.findOne({
      referralCode: payload.referralCode,
    }).lean();
    if (!referrer) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'Invalid referral code provided.',
      );
    }
    referrerId = referrer._id;
  }

  // -----------------------------------------------------
  // Email Login Logic
  // -----------------------------------------------------
  if (payload.email) {
    // Check if email exists in other user models
    const checkModels = ALL_USER_MODELS.map((M: any) =>
      M.isUserExistsByEmail(payload.email).catch(() => null),
    );
    const checkUser = await Promise.all(checkModels);
    const foundUser = checkUser.find((u) => u);

    if (foundUser && foundUser.role !== 'CUSTOMER') {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'This email is already registered as a different role',
      );
    }

    // Fetch existing customer by email
    const existingUser = await Customer.findOne({
      email: payload.email,
    }).lean();

    // Generate OTP
    const { otp } = generateOtp();
    const redisOtpKey = `otp:${payload.email}`;
    await RedisService.set(redisOtpKey, otp, 300); // Store OTP in Redis with 5 minutes expiration

    if (!existingUser) {
      const userId = generateUserId('/create-customer');
      const myReferralCode = await generateReferralCode('DELI');

      await Customer.create({
        userId,
        role: 'CUSTOMER',
        email: payload.email,
        referralCode: myReferralCode,
        referredBy: referrerId,
        requiresOtpVerification: true,
      });
    } else {
      await Customer.updateOne(
        { _id: existingUser._id },
        { requiresOtpVerification: true, isOtpVerified: false },
      );
    }

    const emailHtml = await EmailHelper.createEmailContent(
      {
        otp,
        userEmail: payload.email,
        currentYear: new Date().getFullYear(),
        date: new Date().toDateString(),
        user: existingUser?.name?.firstName || 'Customer',
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
  if (payload.contactNumber) {
    // Fetch existing customer by mobile number
    const existingUser = await Customer.findOne({
      contactNumber: payload.contactNumber,
    }).lean();

    const isTestNumber =
      payload.contactNumber ===
      (config.customer.test_customer_contact_number as string);

    // Send mobile OTP
    const res = await sendMobileOtp(payload.contactNumber);
    const mobileOtpId = isTestNumber ? 'test-otp-id' : res.data.id;

    if (existingUser) {
      await Customer.updateOne(
        { _id: existingUser._id },
        {
          mobileOtpId,
          isOtpVerified: false,
          requiresOtpVerification: true,
        },
      );
    } else {
      const userId = generateUserId('/create-customer');
      const myReferralCode = await generateReferralCode('DELI');
      await Customer.create({
        userId,
        role: 'CUSTOMER',
        contactNumber: payload.contactNumber,
        mobileOtpId,
        referralCode: myReferralCode,
        referredBy: referrerId,
        requiresOtpVerification: true,
      });
    }

    return {
      message: 'OTP sent to your mobile number. Please verify to login.',
    };
  }
};

//save FCM Token
const saveFcmToken = async (currentUser: AuthUser, token: string) => {
  if (!token) {
    throw new AppError(httpStatus.BAD_REQUEST, 'FCM token is required');
  }

  if (!currentUser) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }

  const modelName =
    ROLE_COLLECTION_MAP[currentUser.role as keyof typeof ROLE_COLLECTION_MAP];
  const model = mongoose.model(modelName) as any;

  const deviceLimit = ROLE_DEVICE_LIMITS[currentUser.role] || 3;

  const updateOperation =
    deviceLimit === 1
      ? { $set: { fcmTokens: [token] } }
      : { $addToSet: { fcmTokens: token } };

  const updatedUser = await model.findOneAndUpdate(
    { _id: currentUser._id },
    updateOperation,
    { new: true },
  );

  if (!updatedUser) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }

  return {
    message: 'FCM token saved successfully',
  };
};

// Logout User
const logoutUser = async (email: string, token: string, deviceId?: string) => {
  if (!token) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Fcm token is required');
  }

  const result = await findUserByEmail({ email, isDeleted: false });
  const { user, model } = result || {};

  if (!user || !model) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }

  const updateQuery: any = {
    $pull: { fcmTokens: token },
  };

  if (deviceId) {
    updateQuery.$pull.loginDevices = { deviceId: deviceId };
  }

  if (user.role === 'CUSTOMER') {
    updateQuery.$set = { isEmailVerified: false };
  }

  await model.findOneAndUpdate({ _id: user._id }, updateQuery, { new: true });

  return {
    message:
      user.role === 'CUSTOMER'
        ? 'Customer logged out and email verification reset'
        : `${user?.role} logged out successfully!`,
  };
};
// Change Password
const changePassword = async (
  currentUser: AuthUser,
  payload: { oldPassword: string; newPassword: string },
) => {
  // checking if the user is exist

  const modelName =
    ROLE_COLLECTION_MAP[currentUser.role as keyof typeof ROLE_COLLECTION_MAP];

  const model = mongoose.model(modelName) as any;

  if (!currentUser) {
    throw new AppError(httpStatus.NOT_FOUND, 'This user is not found!');
  }

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

  const isPasswordMatched = await model.isPasswordMatched(
    payload.oldPassword,
    currentUser?.password,
  );

  //checking if the password is correct

  if (!isPasswordMatched)
    throw new AppError(httpStatus.FORBIDDEN, 'Old password does not match');

  //hash new password
  const newHashedPassword = await bcryptjs.hash(
    payload.newPassword,
    Number(config.bcrypt_salt_rounds),
  );

  await model.updateOne(
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
  const { user } = await findUserByEmail({ email });

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
      userName: user?.name?.firstName || 'User',
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
  const { user, model } = await findUserByEmail({ email });

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'This user is not found!');
  }

  if (user?.email !== email) {
    throw new AppError(httpStatus.BAD_REQUEST, "Email doesn't match");
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

  // hashed incoming token
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  //  valid user
  const validUser = await model.findOne({
    email: user.email,
    role: user.role,
    passwordResetToken: hashedToken,
    passwordResetTokenExpiresAt: { $gt: Date.now() },
  });

  if (!validUser) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Reset token is invalid or has been expired',
    );
  }

  const newHashedPassword = await bcryptjs.hash(
    newPassword,
    Number(config.bcrypt_salt_rounds),
  );

  await model.findOneAndUpdate(
    {
      email: user.email,
      role: user.role,
    },
    {
      password: newHashedPassword,
      passwordChangedAt: new Date(),
      passwordResetToken: null,
      passwordResetTokenExpiresAt: null,
    },
  );

  return {
    message: 'Password reset successfully',
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
const submitForApproval = async (userId: string, currentUser: AuthUser) => {
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
  currentUser: AuthUser,
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

    const result = await findUserByEmail({ email });
    userData = result?.user;
    userModel = result?.model;
    if (!userData)
      throw new AppError(
        httpStatus.NOT_FOUND,
        'User not found. Please register.',
      );

    await RedisService.del(redisOtpKey);
  } else if (contactNumber) {
    userData = await Customer.findOne({
      contactNumber,
      isDeleted: false,
    }).lean();
    userModel = Customer;
    if (!userData)
      throw new AppError(
        httpStatus.NOT_FOUND,
        'User not found. Please register.',
      );

    if (contactNumber === config.customer.test_customer_contact_number) {
      if (otp !== config.customer.test_customer_contact_otp) {
        throw new AppError(httpStatus.UNAUTHORIZED, 'Invalid OTP');
      } else {
        console.log('Contact otp verification bypassed for test customer');
      }
    } else {
      console.log(userData.mobileOtpId);
      const res = await verifyMobileOtp(
        userData.mobileOtpId as string,
        otp as string,
      );

      console.log(res);
      if (!res?.data?.verified) {
        throw new AppError(httpStatus.UNAUTHORIZED, 'Invalid or expired OTP');
      }
    }
  }

  if (!userData) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      'User not found. Please register.',
    );
  }

  const deviceLimit = ROLE_DEVICE_LIMITS[userData.role] || 3;

  const newDevice: TLoginDevice = {
    deviceId: deviceDetails?.deviceId || 'unknown',
    deviceType: deviceDetails?.deviceType || 'unknown',
    deviceName: deviceDetails?.deviceName || '',
    userAgent: deviceDetails?.userAgent || '',
    ip: deviceDetails?.ip || '',
    isVerified: true,
    lastLogin: new Date(),
  };

  const existingDeviceIndex = userData.loginDevices?.findIndex(
    (d: TLoginDevice) => d.deviceId === newDevice.deviceId,
  );
  const isSameDevice = existingDeviceIndex > -1;

  if (!isSameDevice && (userData.loginDevices?.length || 0) >= deviceLimit) {
    if (!forceLogin) {
      throw new AppError(httpStatus.FORBIDDEN, 'LIMIT_EXCEEDED');
    }
  }

  const updateQuery: any = {
    $set: { isOtpVerified: true, requiresOtpVerification: false },
  };

  if (email) updateQuery.$set.isEmailVerified = true;

  if (isSameDevice) {
    updateQuery.$set[`loginDevices.${existingDeviceIndex}`] = newDevice;
  } else if (
    forceLogin &&
    (userData.loginDevices?.length || 0) >= deviceLimit
  ) {
    if (deviceLimit === 1) {
      updateQuery.$set.loginDevices = [newDevice];
    } else {
      await userModel.findOneAndUpdate(
        { _id: userData._id },
        { $pop: { loginDevices: -1 } },
      );
      updateQuery.$push = { loginDevices: newDevice };
    }
  } else {
    updateQuery.$push = { loginDevices: newDevice };
  }

  await userModel.findOneAndUpdate({ _id: userData._id }, updateQuery, {
    new: true,
  });

  if (userData.referredBy && !userData.isOtpVerified) {
    await LoyaltyServices.createReferralRecord(
      userData.referredBy,
      userData._id,
    );
  }

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
const softDeleteUser = async (userId: string, currentUser: AuthUser) => {
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
const permanentDeleteUser = async (userId: string, currentUser: AuthUser) => {
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
  saveFcmToken,
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
