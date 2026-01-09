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
  TUserRole,
  USER_ROLE,
  USER_STATUS,
} from '../../constant/user.constant';
import { EmailHelper } from '../../utils/emailSender';
import { createToken, verifyToken } from '../../utils/verifyJWT';
import { TLoginCustomer, TLoginUser } from './auth.interface';
import { findUserByEmailOrId } from '../../utils/findUserByEmailOrId';
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

// Register User
const registerUser = async <
  T extends {
    email: string;
    role: TUserRole;
    isEmailVerified?: boolean;
    registeredBy?: string;
  }
>(
  payload: T,
  url: string,
  currentUser: AuthUser
) => {
  const userType = url.split('/register')[1] as keyof typeof USER_TYPE_MAP;
  const userTypeData = USER_TYPE_MAP[userType];
  const modelData = USER_MODEL_MAP[userType];
  if (!userTypeData || !modelData) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Invalid registration path');
  }

  let registeredBy: string | undefined;
  // Restrict Delivery Partner registration
  if (userType === '/create-delivery-partner') {
    const allowedRoles: TUserRole[] = ['ADMIN', 'SUPER_ADMIN', 'FLEET_MANAGER'];

    if (currentUser.status !== 'APPROVED') {
      throw new AppError(
        httpStatus.FORBIDDEN,
        `You are not approved to register a Delivery Partner. Your account is ${currentUser.status}`
      );
    }
    if (currentUser.role && !allowedRoles.includes(currentUser.role)) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        'You do not have permission to register a Delivery Partner'
      );
    }
    registeredBy = currentUser._id.toString();
  }

  // Restrict sub vendor registration
  if (userType === '/create-sub-vendor') {
    const allowedRoles: TUserRole[] = ['ADMIN', 'SUPER_ADMIN', 'VENDOR'];

    if (currentUser.status !== 'APPROVED') {
      throw new AppError(
        httpStatus.FORBIDDEN,
        `You are not approved to register a Sub Vendor. Your account is ${currentUser.status}`
      );
    }
    if (currentUser.role && !allowedRoles.includes(currentUser.role)) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        'You do not have permission to register a Sub Vendor'
      );
    }

    registeredBy = currentUser._id.toString();
  }

  const { Model, idField } = modelData;
  const mongooseModel = Model as unknown as Model<T>;

  // Generate userId & OTP
  const userID = generateUserId(userType);
  payload.role = userTypeData.role;
  const { otp, otpExpires } = generateOtp();

  //  Check existing user in ALL models
  const checkModels = ALL_USER_MODELS.map((M: any) =>
    M.isUserExistsByEmail(payload.email).catch(() => null)
  );

  const checkUser = await Promise.all(checkModels);

  const existingUser = checkUser.find((user) => user && user.email);
  if (existingUser && existingUser.isEmailVerified) {
    throw new AppError(
      httpStatus.CONFLICT,
      `${existingUser.email} already exists as ${existingUser.role}. Please Login!`
    );
  }

  if (existingUser && !existingUser.isEmailVerified) {
    const index = checkUser.findIndex(
      (user) => user && user.email === existingUser.email
    );

    if (index !== -1) {
      const modelToDelete = ALL_USER_MODELS[index];
      try {
        await modelToDelete.deleteOne({ email: existingUser.email });
      } catch (error) {
        throw new AppError(
          httpStatus.INTERNAL_SERVER_ERROR,
          'Error deleting user'
        );
      }
    }
  }

  let createdUser: any = null;
  try {
    const result = await mongooseModel.create([
      {
        ...payload,
        [idField]: userID,
        registeredBy,
        otp,
        isOtpExpired: otpExpires,
      },
    ]);
    createdUser = Array.isArray(result) ? result[0] : result;
  } catch (err: any) {
    if (err?.code === 11000) {
      throw new AppError(
        httpStatus.CONFLICT,
        'Something went wrong. Please try again'
      );
    }
    throw err;
  }
  // create email html
  const emailHtml = await EmailHelper.createEmailContent(
    {
      otp,
      userEmail: payload.email,
      currentYear: new Date().getFullYear(),
      date: new Date().toDateString(),
      user: payload?.role.toLocaleLowerCase(),
    },
    'verify-email'
  );

  // send email
  try {
    await EmailHelper.sendEmail(
      payload?.email,
      emailHtml,
      'Verify your email for DeliGo'
    );
  } catch (err: any) {
    console.error('Email sending failed:', err);
  }

  return {
    message: `${payload.role} registered successfully. Please check your email for verification.`,
    data: createdUser,
  };
};

// Login User
const loginUser = async (payload: TLoginUser) => {
  // checking if the user is exist
  const result = await findUserByEmailOrId({
    email: payload?.email,
    isDeleted: false,
  });
  const user = result?.user;
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }
  await findUserByEmailOrId({ userId: user?.userId, isDeleted: false });
  const userModel = result?.model;

  // checking if the user is blocked

  const userStatus = user?.status;

  if (userStatus === USER_STATUS.BLOCKED) {
    throw new AppError(httpStatus.FORBIDDEN, 'This user is blocked!');
  }

  if (!user?.isEmailVerified) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'This user is not verified. Please verify your email.'
    );
  }

  //checking if the password is correct

  if (payload.password && userModel) {
    if (
      !(await userModel?.isPasswordMatched(payload?.password, user?.password))
    )
      throw new AppError(httpStatus.FORBIDDEN, 'Password do not matched');
  }

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
  };

  const accessToken = createToken(
    jwtPayload,
    config.jwt.jwt_access_secret as string,
    config.jwt.jwt_access_expires_in as string
  );

  const refreshToken = createToken(
    jwtPayload,
    config.jwt.jwt_refresh_secret as string,
    config.jwt.jwt_refresh_expires_in as string
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
      'Email or contact number is required'
    );
  }

  // -----------------------------------------------------
  // Email Login Logic
  // -----------------------------------------------------
  if (payload.email) {
    // Check if email exists in other user models
    const checkModels = ALL_USER_MODELS.map((M: any) =>
      M.isUserExistsByEmail(payload.email).catch(() => null)
    );
    const checkUser = await Promise.all(checkModels);
    const user = checkUser.find((u) => u);

    if (user && user.role !== 'CUSTOMER') {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'This email is already registered as a different role'
      );
    }

    // Fetch existing customer by email
    const existingUser = await Customer.findOne({ email: payload.email });

    // Generate OTP
    const { otp, otpExpires } = generateOtp();

    if (existingUser) {
      Object.assign(existingUser, {
        otp,
        isOtpExpired: otpExpires,
        isOtpVerified: false,
        requiresOtpVerification: true,
      });
      await existingUser.save();
    } else {
      const userId = generateUserId('/create-customer');
      await Customer.create({
        userId,
        role: 'CUSTOMER',
        email: payload.email,
        otp,
        isOtpExpired: otpExpires,
        requiresOtpVerification: true,
      });
    }

    // Prepare email content and send
    const emailHtml = await EmailHelper.createEmailContent(
      {
        otp,
        userEmail: payload.email,
        currentYear: new Date().getFullYear(),
        date: new Date().toDateString(),
        user: existingUser?.name?.firstName || 'Customer',
      },
      'verify-email'
    );
    try {
      await EmailHelper.sendEmail(
        payload.email,
        emailHtml,
        'Verify your email for DeliGo'
      );
    } catch (err: any) {
      throw new AppError(httpStatus.INTERNAL_SERVER_ERROR, err.message);
    }

    return { message: 'OTP sent to your email. Please verify to login.' };
  }

  // -----------------------------------------------------
  // Mobile Login Logic
  // -----------------------------------------------------
  if (payload.contactNumber) {
    // Fetch existing customer by mobile number
    const existingUser = await Customer.findOne({
      contactNumber: payload.contactNumber,
    });

    // Send mobile OTP
    const res = await sendMobileOtp(payload.contactNumber);
    const mobileOtpId = res?.data?.id;

    if (existingUser) {
      Object.assign(existingUser, {
        mobileOtpId,
        isOtpVerified: false,
        requiresOtpVerification: true,
      });
      await existingUser.save();
    } else {
      const userId = generateUserId('/create-customer');
      await Customer.create({
        userId,
        role: 'CUSTOMER',
        contactNumber: payload.contactNumber,
        mobileOtpId,
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

  // Add new token if not exists
  const tokens = new Set([...(currentUser.fcmTokens || []), token]);
  currentUser.fcmTokens = Array.from(tokens);
  await (currentUser as any).save();
  return {
    message: 'FCM token saved successfully',
  };
};

// Logout User
const logoutUser = async (email: string) => {
  const result = await findUserByEmailOrId({ email, isDeleted: false });
  const user = result?.user;

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }

  if (user?.role === 'CUSTOMER') {
    user.isEmailVerified = false;
    await user.save();
  }

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
  payload: { oldPassword: string; newPassword: string }
) => {
  // checking if the user is exist

  const modelName =
    ROLE_COLLECTION_MAP[currentUser.role as keyof typeof ROLE_COLLECTION_MAP];

  const model = mongoose.model(modelName) as any;

  if (!currentUser) {
    throw new AppError(httpStatus.NOT_FOUND, 'This user is not found!');
  }

  if (currentUser?.role === 'CUSTOMER') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'Customer no need to change password'
    );
  }

  // checking if the user is blocked

  const userStatus = currentUser?.status;

  if (userStatus === USER_STATUS.REJECTED) {
    throw new AppError(httpStatus.FORBIDDEN, `This user is ${userStatus}!`);
  }
  if (userStatus === USER_STATUS.BLOCKED) {
    throw new AppError(httpStatus.FORBIDDEN, `This user is ${userStatus}!`);
  }

  //checking if the password is correct

  if (
    !(await model.isPasswordMatched(payload.oldPassword, currentUser?.password))
  )
    throw new AppError(httpStatus.FORBIDDEN, 'Password do not matched');

  //hash new password
  const newHashedPassword = await bcryptjs.hash(
    payload.newPassword,
    Number(config.bcrypt_salt_rounds)
  );

  await model.findOneAndUpdate(
    {
      userId: currentUser.userId,
      role: currentUser.role,
    },
    {
      password: newHashedPassword,
      passwordChangedAt: new Date(),
    }
  );

  return null;
};

// Forgot Password
const forgotPassword = async (email: string) => {
  const result = await findUserByEmailOrId({ email, isDeleted: false });
  const user = result?.user;

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'This user is not found!');
  }

  if (user?.role === 'CUSTOMER') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'Customer no need to reset password'
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
    'reset-password'
  );

  // send email
  try {
    await EmailHelper.sendEmail(
      email,
      emailHtml,
      'Reset your password for DeliGo'
    );
  } catch (err: any) {
    throw new AppError(httpStatus.INTERNAL_SERVER_ERROR, err.message);
  }

  return {
    message: 'Password reset link sent to your email address successfully',
    token,
  };
};

// reset Password
const resetPassword = async (
  email: string,
  token: string,
  newPassword: string
) => {
  const result = await findUserByEmailOrId({ email, isDeleted: false });
  const user = result?.user;
  const model = result?.model;

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'This user is not found!');
  }

  if (user?.email !== email) {
    throw new AppError(httpStatus.BAD_REQUEST, "Email doesn't match");
  }

  if (user?.role === 'CUSTOMER') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'Customer no need to reset password'
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
      'Reset token is invalid or has been expired'
    );
  }

  const newHashedPassword = await bcryptjs.hash(
    newPassword,
    Number(config.bcrypt_salt_rounds)
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
    }
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
    config.jwt.jwt_refresh_secret as string
  ) as JwtPayload;

  const { iat, userId } = decoded;

  const result = await findUserByEmailOrId({ userId, isDeleted: false });

  const user = result?.user;
  const model = result?.model;

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'This user is not found!');
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
      iat as number
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
  };

  const accessToken = createToken(
    jwtPayload,
    config.jwt.jwt_access_secret as string,
    config.jwt.jwt_access_expires_in as string
  );

  return {
    accessToken,
  };
};

// submit approval request service
const submitForApproval = async (userId: string, currentUser: AuthUser) => {
  const { user: submittedUser } = await findUserByEmailOrId({
    userId,
    isDeleted: false,
  });
  if (!submittedUser) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }
  if (currentUser?.role === 'DELIVERY_PARTNER') {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "You can't submit approval request."
    );
  }

  if (submittedUser?.status === 'SUBMITTED') {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'You have already submitted the approval request. Please wait for admin approval.'
    );
  }
  if (submittedUser?.status === 'APPROVED') {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Your account is already approved.'
    );
  }

  if (submittedUser?.role === 'DELIVERY_PARTNER') {
    if (
      currentUser?.role === 'FLEET_MANAGER' &&
      submittedUser?.registeredBy.toString() !== currentUser._id.toString()
    ) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        'You do not have permission to submit approval request for this user1'
      );
    }
  } else {
    if (submittedUser.userId !== currentUser.userId) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        'You do not have permission to submit approval request for this user2'
      );
    }
  }

  submittedUser.status = 'SUBMITTED';
  submittedUser.submittedForApprovalAt = new Date();
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
    'user-approval-submission-notification'
  );

  try {
    await EmailHelper.sendEmail(
      submittedUser?.email,
      emailHtml,
      `New ${submittedUser?.role} Submission for Approval`
    );
  } catch (err: any) {
    throw new AppError(httpStatus.INTERNAL_SERVER_ERROR, err.message);
  }

  // send push notification to all admin
  NotificationService.sendToRole(
    'Admin',
    ['ADMIN', 'SUPER_ADMIN'],
    'New User Submission for Approval',
    `New ${submittedUser?.role} Submission for Approval`,
    { userId: submittedUser?._id.toString(), role: submittedUser?.role },
    'ACCOUNT'
  );

  return {
    message: `${submittedUser?.role} submitted for approval successfully`,
  };
};

// Active or Block User Service
const approvedOrRejectedUser = async (
  userId: string,
  payload: TApprovedRejectsPayload,
  currentUser: AuthUser
) => {
  // --------------------------------------------------------------
  // Authorization & Validation
  // --------------------------------------------------------------
  if (userId === currentUser.userId) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'You cannot change your own status'
    );
  }

  const admin = await Admin.findOne({
    userId: currentUser.userId,
    isDeleted: false,
  });
  if (!admin) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Admin not found');
  }

  const { user: submittedUser } = await findUserByEmailOrId({
    userId,
    isDeleted: false,
  });

  if (!submittedUser) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }

  if (submittedUser.status === payload.status) {
    //
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `User is already ${payload.status.toLowerCase()}`
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
      `Remarks are required for ${payload.status.toLowerCase()}`
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
    'ACCOUNT'
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
    'user-approval-notification'
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
  otp?: string
) => {
  if (!email && !contactNumber) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Email or contact number is required for OTP verification'
    );
  }

  let user: any = undefined;

  if (email) {
    const result = await findUserByEmailOrId({ email, isDeleted: false });
    user = result?.user;

    if (!user)
      throw new AppError(
        httpStatus.NOT_FOUND,
        'User not found. Please register.'
      );
    if (user.otp !== otp)
      throw new AppError(httpStatus.UNAUTHORIZED, 'Invalid OTP');
    if (user.isOtpExpired && user.isOtpExpired < new Date())
      throw new AppError(httpStatus.UNAUTHORIZED, 'OTP has expired');

    user.isEmailVerified = true;
    user.otp = undefined;
    user.isOtpExpired = undefined;
    if (user.role === 'CUSTOMER') {
      user.requiresOtpVerification = false;
      user.isOtpVerified = true;
    }
  } else if (contactNumber) {
    user = await Customer.findOne({ contactNumber, isDeleted: false });
    if (!user)
      throw new AppError(
        httpStatus.NOT_FOUND,
        'User not found. Please register.'
      );

    const res = await verifyMobileOtp(
      user.mobileOtpId as string,
      otp as string
    );
    if (!res?.data?.verified) {
      throw new AppError(httpStatus.UNAUTHORIZED, 'Invalid or expired OTP');
    }

    user.isOtpVerified = true;
    user.requiresOtpVerification = false;
    user.mobileOtpId = undefined;
  }

  if (!user) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      'User not found. Please register.'
    );
  }

  await user.save();

  const jwtPayload = {
    userId: user.userId,
    name: {
      firstName: user.name.firstName,
      lastName: user.name.lastName,
    },
    email: user.email,
    contactNumber: user.contactNumber,
    role: user.role,
    status: user.status,
  };

  const accessToken = createToken(
    jwtPayload,
    config.jwt.jwt_access_secret as string,
    config.jwt.jwt_access_expires_in as string
  );
  const refreshToken = createToken(
    jwtPayload,
    config.jwt.jwt_refresh_secret as string,
    config.jwt.jwt_refresh_expires_in as string
  );

  return {
    message: email
      ? `${user.role} Email verified successfully`
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
      'Email or contact number is required to resend OTP'
    );
  }
  let user;
  if (contactNumber) {
    user = await Customer.findOne({ contactNumber, isDeleted: false });
    if (!user) {
      throw new AppError(
        httpStatus.NOT_FOUND,
        'User not found. Please register.'
      );
    }
    const id = user.mobileOtpId;
    if (!id) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'No OTP found to resend. Please request a new OTP.'
      );
    }
    await resendMobileOtp(id as string);
    user.isOtpVerified = false;
    user.requiresOtpVerification = true;
    await user.save();
  }
  if (email) {
    const { user } = await findUserByEmailOrId({ email, isDeleted: false });
    if (!user) {
      throw new AppError(
        httpStatus.NOT_FOUND,
        'User not found. Please register.'
      );
    }

    if (user?.isEmailVerified) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'User is already verified. Please login.'
      );
    }
    const { otp, otpExpires } = generateOtp();
    user.otp = otp;
    user.isOtpExpired = otpExpires;
    await user.save();

    // Prepare email template content
    const emailHtml = await EmailHelper.createEmailContent(
      {
        otp,
        userEmail: user?.email,
        currentYear: new Date().getFullYear(),
        date: new Date().toDateString(),
        user: user?.name?.firstName || user?.role.toLocaleLowerCase(),
      },
      'verify-email'
    );

    // Send verification email
    try {
      await EmailHelper.sendEmail(
        email,
        emailHtml,
        'Verify your email for DeliGo'
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
      `You are not approved to delete a user. Your account is ${currentUser.status}`
    );
  }

  const { user: existingUser } = await findUserByEmailOrId({
    userId,
    isDeleted: false,
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
        'You do not have permission to delete this user!'
      );
    }
  }

  if (
    currentUser?.role === 'FLEET_MANAGER' &&
    existingUser?.role === 'DELIVERY_PARTNER'
  ) {
    if (currentUser?._id.toString() !== existingUser?.registeredBy.toString()) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        'You do not have permission to delete this user!'
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
      `You are not approved to delete a user. Your account is ${currentUser.status}`
    );
  }

  const { user: existingUser, model } = await findUserByEmailOrId({ userId });
  if (!existingUser) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      'User already permanently deleted!'
    );
  }

  if (!existingUser.isDeleted) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'User should be soft deleted first!'
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
