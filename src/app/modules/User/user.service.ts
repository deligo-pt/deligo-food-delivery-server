import { QueryBuilder } from '../../builder/QueryBuilder';
import config from '../../config';
import AppError from '../../errors/AppError';
import { EmailHelper } from '../../utils/emailSender';
import { createToken } from '../../utils/verifyJWT';
import { UserSearchableFields } from './user.constant';
import { TUser } from './user.interface';
import { User } from './user.model';
import httpStatus from 'http-status';
import { v4 as uuidv4 } from 'uuid';

// Register a new customer
const createCustomer = async (payload: TUser) => {
  const isUserExistsByEmail = await User.isUserExistsByEmail(payload.email);
  if (isUserExistsByEmail) {
    throw new AppError(
      httpStatus.CONFLICT,
      'User with this email already exists'
    );
  }
  // Generate unique ID
  const id = uuidv4().split('-')[0];
  payload.id = id;

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const otpExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 mins

  const newUser = await User.create({
    ...payload,
    otp,
    isOtpExpired: otpExpires,
  });

  // Prepare email template content
  const emailHtml = await EmailHelper.createEmailContent(
    { otp, userEmail: payload.email, currentYear: new Date().getFullYear() },
    'verify-email'
  );

  // Send verification email
  await EmailHelper.sendEmail(
    payload.email,
    emailHtml,
    'Verify your email for DeliGo'
  );

  return {
    message: 'User created successfully. Please verify your email.',
    user: newUser,
  };
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
    _id: user._id,
    name: user.name ?? '',
    email: user.email,
    mobileNumber: user.mobileNumber,
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
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const otpExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 mins
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

const getSingleUserFromDB = async (id: string) => {
  const user = await User.findById(id);

  return user;
};

export const UserServices = {
  createCustomer,
  verifyOtp,
  resendOtp,
  getAllUsersFromDB,
  getSingleUserFromDB,
};
