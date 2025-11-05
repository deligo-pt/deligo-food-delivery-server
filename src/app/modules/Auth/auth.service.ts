/* eslint-disable @typescript-eslint/no-explicit-any */
import httpStatus from 'http-status';
import AppError from '../../errors/AppError';
import generateUserId, { USER_TYPE_MAP } from '../../utils/generateUserId';
import generateOtp from '../../utils/generateOtp';
import mongoose, { Model } from 'mongoose';
import {
  ALL_USER_MODELS,
  TApprovedRejectsPayload,
  USER_MODEL_MAP,
} from './auth.constant';
import { AuthUser, USER_ROLE, USER_STATUS } from '../../constant/user.const';
import { EmailHelper } from '../../utils/emailSender';
import config from '../../config';
import { createToken } from '../../utils/verifyJWT';
import { findUserByEmail } from '../../utils/findUserByEmail';
import { TLoginUser } from './auth.interface';

// Register User
const registerUser = async <
  T extends {
    email: string;
    role: keyof typeof USER_ROLE;
    isEmailVerified?: boolean;
  }
>(
  payload: T,
  url: string,
  currentUserRole?: keyof typeof USER_ROLE
) => {
  const userType = url.split('/register')[1] as keyof typeof USER_TYPE_MAP;
  const userTypeData = USER_TYPE_MAP[userType];
  const modelData = USER_MODEL_MAP[userType];
  if (!userTypeData || !modelData) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Invalid registration path');
  }

  // Restrict Delivery Partner registration
  if (userType === '/create-delivery-partner') {
    const allowedRoles: (keyof typeof USER_ROLE)[] = [
      'ADMIN',
      'SUPER_ADMIN',
      'FLEET_MANAGER',
    ];

    if (currentUserRole && !allowedRoles.includes(currentUserRole)) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        'You do not have permission to register a Delivery Partner'
      );
    }
  }

  const { Model, idField } = modelData;

  let user;
  const userID = generateUserId(userType);
  payload.role = userTypeData.role;
  // Generate OTP
  const { otp, otpExpires } = generateOtp();

  const mongooseModel = Model as unknown as Model<T>;
  //  Check existing user in ALL models
  let existingUser: any = null;
  for (const EachModel of ALL_USER_MODELS) {
    const user = await EachModel.isUserExistsByEmail(payload.email);
    if (user) {
      existingUser = user;
      break;
    }
  }

  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    if (existingUser) {
      if (existingUser?.isEmailVerified) {
        throw new AppError(
          httpStatus.CONFLICT,
          `${existingUser.email} already exists. Please Login!`
        );
      }

      // Delete from its own collection

      let modelToDelete: any = null;

      for (const M of ALL_USER_MODELS) {
        // if (typeof (M as any).isUserExistsByEmail !== 'function') continue;

        const foundUser = await M.isUserExistsByEmail(existingUser.email);
        if (foundUser && !foundUser.isEmailVerified) {
          modelToDelete = M;
          break;
        }
      }

      if (modelToDelete) {
        await modelToDelete.deleteOne(
          { email: existingUser.email },
          { session }
        );
        console.log(
          ` Deleted unverified user from: ${modelToDelete.modelName}`
        );
      }
    }

    // Create user
    user = await mongooseModel.create(
      [
        {
          ...payload,
          [idField]: userID,
          otp,
          isOtpExpired: otpExpires,
        },
      ],
      { session }
    );

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
    await session.endSession();
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }

  return user;
};

const loginUser = async (payload: TLoginUser) => {
  // checking if the user is exist
  const result = await findUserByEmail(payload?.email);
  const user = result?.user;
  const userModel = result?.model;

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'This user is not found!');
  }

  // checking if the user is blocked

  const userStatus = user?.status;

  if (userStatus === 'REJECTED') {
    throw new AppError(httpStatus.FORBIDDEN, 'This user is blocked!');
  }

  if (!user?.isEmailVerified && user.role !== 'CUSTOMER') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'This user is not verified. Please verify your email.'
    );
  }

  if (user.role === 'CUSTOMER') {
    const { otp, otpExpires } = generateOtp();

    user.otp = otp;
    user.isOtpExpired = otpExpires;
    await user.save();
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

    return {
      message: 'OTP sent to your email. Please verify to login.',
      requiresOtpVerification: true,
    };
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
    id:
      user?.customerId ||
      user?.vendorId ||
      user?.deliveryPartnerId ||
      user?.adminId ||
      user?.fleetManagerId ||
      user?.superAdminId ||
      '',
    name: `${user?.name?.firstName || ''} ${user?.name?.lastName || ''}`.trim(),
    email: user?.email,
    contactNumber: user?.contactNumber,
    role: user?.role,
    status: user?.status,
  };

  const accessToken = createToken(
    jwtPayload,
    config.jwt_access_secret as string,
    config.jwt_access_expires_in as string
  );

  const refreshToken = createToken(
    jwtPayload,
    config.jwt_refresh_secret as string,
    config.jwt_refresh_expires_in as string
  );

  return {
    accessToken,
    refreshToken,
  };
};

const logoutUser = async (email: string) => {
  const result = await findUserByEmail(email);
  const user = result?.user;

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'This user is not found!');
  }

  if (user?.role === 'CUSTOMER') {
    user.isEmailVerified = false;
    await user.save();
  }

  return {
    message:
      user.role === 'CUSTOMER'
        ? 'Customer logged out and email verification reset'
        : 'User logged out successfully',
  };
};

// const changePassword = async (
//   userData: JwtPayload,
//   payload: { oldPassword: string; newPassword: string }
// ) => {
//   // checking if the user is exist
//   const user = await User.isUserExistsByEmail(userData.email);

//   if (!user) {
//     throw new AppError(httpStatus.NOT_FOUND, 'This user is not found!');
//   }

//   // checking if the user is blocked

//   const userStatus = user?.status;

//   if (userStatus === 'REJECTED') {
//     throw new AppError(httpStatus.FORBIDDEN, 'This user is blocked!');
//   }

//   //checking if the password is correct

//   if (!(await User.isPasswordMatched(payload.oldPassword, user?.password)))
//     throw new AppError(httpStatus.FORBIDDEN, 'Password do not matched');

//   //hash new password
//   const newHashedPassword = await bcrypt.hash(
//     payload.newPassword,
//     Number(config.bcrypt_salt_rounds)
//   );

//   await User.findOneAndUpdate(
//     {
//       email: userData.email,
//       role: userData.role,
//     },
//     {
//       password: newHashedPassword,
//       passwordChangedAt: new Date(),
//     }
//   );

//   return null;
// };

// const refreshToken = async (token: string) => {
//   // checking if the given token is valid
//   const decoded = jwt.verify(
//     token,
//     config.jwt_refresh_secret as string
//   ) as JwtPayload;

//   const { email, iat } = decoded;

//   // checking if the user is exist
//   const user = await User.isUserExistsByEmail(email);

//   if (!user) {
//     throw new AppError(httpStatus.NOT_FOUND, 'This user is not found!');
//   }

//   // checking if the user is blocked
//   const userStatus = user?.status;

//   if (userStatus === 'REJECTED') {
//     throw new AppError(httpStatus.FORBIDDEN, 'This user is blocked!');
//   }

//   if (
//     user.passwordChangedAt &&
//     User.isJWTIssuedBeforePasswordChanged(user.passwordChangedAt, iat as number)
//   ) {
//     throw new AppError(httpStatus.UNAUTHORIZED, 'You are not authorized!');
//   }

//   const jwtPayload = {
//     id: user.id,
//     name: user.name ?? '',
//     email: user.email,
//     contactNumber: user.contactNumber,
//     role: user.role,
//     status: user.status,
//   };

//   const accessToken = createToken(
//     jwtPayload,
//     config.jwt_access_secret as string,
//     config.jwt_access_expires_in as string
//   );

//   return {
//     accessToken,
//   };
// };

// Active or Block User Service

const approvedOrRejectedUser = async (
  email: string,
  payload: TApprovedRejectsPayload,
  user: AuthUser
) => {
  const result = await findUserByEmail(email);
  const existingUser = result?.user;
  if (!existingUser) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }

  if (email === user.email) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'You cannot change your own status'
    );
  }

  if (
    existingUser.role !== 'CUSTOMER' &&
    existingUser?.status !== 'SUBMITTED'
  ) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `User not submitted the approval request yet`
    );
  }

  if (existingUser.status === payload.status) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `User is already ${payload.status.toLowerCase()}`
    );
  }

  existingUser.status = payload.status;
  if (payload.status === 'APPROVED') {
    existingUser.approvedBy = user.id;
    existingUser.remarks =
      payload.remarks ||
      'Congratulations! Your account has successfully met all the required criteria, and we’re excited to have you on board. Our team will reach out shortly with the next steps to help you get started and make the most of your role on our platform.';
  } else if (payload.status === 'REJECTED') {
    existingUser.rejectedBy = user.id;
    if (!payload.remarks) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'Remarks are required for rejection'
      );
    }
    existingUser.remarks = payload.remarks;
  }
  await existingUser.save();

  // Prepare email content
  const emailData = {
    userName: existingUser.name?.firstName || 'User',
    userRole: existingUser.role,
    currentYear: new Date().getFullYear(),
    remarks: existingUser.remarks || '',
    isApproved: payload.status === 'APPROVED',
  };

  const emailHtml = await EmailHelper.createEmailContent(
    emailData,
    'user-approval-notification'
  );

  const emailSubject =
    payload.status === 'APPROVED'
      ? `Your ${existingUser?.role} Application has been Approved`
      : `Your ${existingUser?.role} Application has been Rejected`;

  // Send email
  await EmailHelper.sendEmail(existingUser.email, emailHtml, emailSubject);

  return {
    message: `${
      existingUser?.role
    } ${payload.status.toLowerCase()} successfully`,
  };
};

// Verify OTP
const verifyOtp = async (email: string, otp: string) => {
  const result = await findUserByEmail(email);
  const user = result?.user;

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
    status: user.status as keyof typeof USER_STATUS,
  };

  const accessToken = createToken(
    jwtPayload,
    config.jwt_access_secret as string,
    config.jwt_access_expires_in as string
  );

  const refreshToken = createToken(
    jwtPayload,
    config.jwt_refresh_secret as string,
    config.jwt_refresh_expires_in as string
  );

  return {
    message: 'Email verified successfully',
    accessToken,
    refreshToken,
  };
};

// Resend OTP
const resendOtp = async (email: string) => {
  const result = await findUserByEmail(email);
  const user = result?.user;
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

export const AuthServices = {
  registerUser,
  loginUser,
  logoutUser,
  // changePassword,
  // refreshToken,
  resendOtp,
  verifyOtp,
  approvedOrRejectedUser,
};
