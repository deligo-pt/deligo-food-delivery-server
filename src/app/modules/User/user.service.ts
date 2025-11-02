import mongoose from 'mongoose';
import { QueryBuilder } from '../../builder/QueryBuilder';
import config from '../../config';
import AppError from '../../errors/AppError';
import { EmailHelper } from '../../utils/emailSender';
import generateOtp from '../../utils/generateOtp';
import generateUserId, { USER_TYPE_MAP } from '../../utils/generateUserId';
import { createToken } from '../../utils/verifyJWT';
import { USER_STATUS, UserSearchableFields } from './user.constant';
import { TUser } from './user.interface';
import { User } from './user.model';
import httpStatus from 'http-status';
import { Vendor } from '../Vendor/vendor.model';
import { AuthUser } from '../../constant/user.const';
import { Agent } from '../Agent/agent.model';

// Register a new user (customer, vendor, agent, delivery partner)
const createUser = async (payload: TUser, url: string) => {
  const userType = url.split('/users')[1] as keyof typeof USER_TYPE_MAP;
  const userTypeData = USER_TYPE_MAP[userType];

  if (!userTypeData) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Invalid registration path');
  }
  const existingUser = await User.isUserExistsByEmail(payload.email);
  const existingVendor = await Vendor.findOne({
    vendorId: existingUser?.id,
  });
  const existingAgent = await Agent.findOne({
    agentId: existingUser?.id,
  });

  let newUser;
  let secondaryUser;
  const session = await mongoose.startSession();

  try {
    session.startTransaction();
    if (existingUser && !existingUser.isEmailVerified) {
      if (userType === '/create-vendor') {
        await Vendor.deleteOne(
          { vendorId: existingVendor?.vendorId },
          { session }
        );
      } else if (userType === '/create-agent') {
        await Agent.deleteOne({ agentId: existingAgent?.agentId }, { session });
      }
      await User.deleteOne({ id: existingUser?.id }, { session });
    }
    if (existingUser && existingUser.isEmailVerified) {
      throw new AppError(
        httpStatus.CONFLICT,
        'User with this email already exists. Please Login!'
      );
    }
    // Assign user ID and role
    const userId = generateUserId(userType);
    payload.id = userId;
    payload.role = userTypeData.role as TUser['role'];

    // Generate OTP
    const { otp, otpExpires } = generateOtp();

    if (userType === '/create-admin') {
      payload.status = 'PENDING';
    }

    // Create user in DB
    newUser = await User.create(
      [
        {
          ...payload,
          otp,
          isOtpExpired: otpExpires,
        },
      ],
      { session }
    );

    if (userType === '/create-vendor') {
      secondaryUser = await Vendor.create([{ vendorId: userId }], { session });
    } else if (userType === '/create-agent') {
      secondaryUser = await Agent.create([{ agentId: userId }], { session });
    }
    // Prepare & send verification email
    const emailHtml = await EmailHelper.createEmailContent(
      {
        otp,
        userEmail: payload.email,
        currentYear: new Date().getFullYear(),
      },
      'verify-email'
    );

    await EmailHelper.sendEmail(
      payload.email,
      emailHtml,
      'Verify your email for DeliGo'
    );

    await session.commitTransaction();
    session.endSession();
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
  // Return response
  return {
    message: 'User created successfully. Please verify your email.',
    data: { newUser, secondaryUser },
  };
};

const updateUser = async (
  payload: Partial<TUser>,
  id: string,
  user: AuthUser
) => {
  const existingUser = await User.findOne({ id });
  if (!existingUser) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found!');
  }
  if (!existingUser?.isEmailVerified) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Please verify your email');
  }
  if (user?.id !== existingUser?.id) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'You are not authorized for update'
    );
  }
  const updateUser = await User.findOneAndUpdate({ id }, payload, {
    new: true,
  });
  return updateUser;
};

// Active or Block User Service
const activateOrBlockUser = async (
  id: string,
  payload: { status: keyof typeof USER_STATUS },
  user: AuthUser
) => {
  const existingUser = await User.findOne({ id });
  if (!existingUser) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }

  if (id === user.id) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'You cannot change your own status'
    );
  }

  existingUser.status = payload.status;
  await existingUser.save();
  return existingUser;
};

// Verify OTP
const verifyOtp = async (email: string, otp: string) => {
  const user = await User.findOne({ email });
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }

  if (user?.isEmailVerified) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'User is already verified. Please log in.'
    );
  }

  if (user.otp !== otp) {
    throw new AppError(httpStatus.UNAUTHORIZED, 'Invalid OTP');
  }
  if (user.isOtpExpired && user.isOtpExpired < new Date()) {
    throw new AppError(httpStatus.UNAUTHORIZED, 'OTP has expired');
  }
  user.isEmailVerified = true;
  user.otp = undefined;
  user.isOtpExpired = undefined;
  await user.save();

  // Generate JWT token after successful verification
  const jwtPayload = {
    id: user.id,
    email: user.email,
    role: user.role,
    status: user.status,
  };

  const accessToken = createToken(
    jwtPayload,
    config.jwt_access_secret as string,
    config.jwt_access_expires_in as string
  );

  return {
    message: 'Email verified successfully',
    accessToken,
  };
};

// Resend OTP
const resendOtp = async (email: string) => {
  const user = await User.findOne({ email });
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }
  if (user?.isEmailVerified) {
    throw new AppError(httpStatus.BAD_REQUEST, 'User is already verified');
  }
  const { otp, otpExpires } = generateOtp();
  user.otp = otp;
  user.isOtpExpired = otpExpires;
  await user.save();

  // Prepare email template content
  const emailHtml = await EmailHelper.createEmailContent(
    { otp, userEmail: email, currentYear: new Date().getFullYear() },
    'verify-email'
  );

  // Send verification email
  await EmailHelper.sendEmail(email, emailHtml, 'Verify your email for DeliGo');
  return {
    message: 'OTP resent successfully. Please check your email.',
  };
};

//get all users
const getAllUsersFromDB = async (query: Record<string, unknown>) => {
  const users = new QueryBuilder(User.find(), query)
    .fields()
    .paginate()
    .sort()
    .filter()
    .search(UserSearchableFields);

  const result = await users.modelQuery;

  return result;
};

// get single user
const getSingleUserFromDB = async (id: string, user: AuthUser) => {
  const existingUser = await User.findOne({ id });
  if (!existingUser) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found!');
  }

  if (user?.role === 'ADMIN' && existingUser?.role === 'SUPER_ADMIN') {
    throw new AppError(httpStatus.FORBIDDEN, 'Admin not access Super Admin');
  }

  return existingUser;
};

export const UserServices = {
  createUser,
  updateUser,
  activateOrBlockUser,
  verifyOtp,
  resendOtp,
  getAllUsersFromDB,
  getSingleUserFromDB,
};
