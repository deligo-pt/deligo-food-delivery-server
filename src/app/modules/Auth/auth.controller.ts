import httpStatus from 'http-status';
import sendResponse from '../../utils/sendResponse';
import { AuthServices } from './auth.service';
import { catchAsync } from '../../utils/catchAsync';
import { AuthUser, USER_ROLE } from '../../constant/user.const';
import config from '../../config';

const registerUser = catchAsync(async (req, res) => {
  const url = req.originalUrl;
  const result = await AuthServices.registerUser(
    req.body,
    url,
    req.user?.role as keyof typeof USER_ROLE
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'User registered in successfully!',
    data: result,
  });
});

const loginUser = catchAsync(async (req, res) => {
  const result = await AuthServices.loginUser(req.body);

  if (result?.requiresOtpVerification) {
    return sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: result?.message,
      data: null,
    });
  }

  const { refreshToken, accessToken } = result;

  res.cookie('refreshToken', refreshToken, {
    secure: config.NODE_ENV === 'production',
    httpOnly: true,
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'User logged in successfully!',
    data: {
      accessToken,
      refreshToken,
    },
  });
});

const logoutUser = catchAsync(async (req, res) => {
  res.clearCookie('refreshToken');
  const result = await AuthServices.logoutUser(req.user.email);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result?.message,
    data: null,
  });
});

// const changePassword = catchAsync(async (req, res) => {
//   const { ...passwordData } = req.body;

//   const result = await AuthServices.changePassword(req.user, passwordData);
//   sendResponse(res, {
//     statusCode: httpStatus.OK,
//     success: true,
//     message: 'Password updated successfully!',
//     data: result,
//   });
// });

// const refreshToken = catchAsync(async (req, res) => {
//   const { refreshToken } = req.cookies;
//   const result = await AuthServices.refreshToken(refreshToken);

//   sendResponse(res, {
//     statusCode: httpStatus.OK,
//     success: true,
//     message: 'Access token retrieved successfully!',
//     data: result,
//   });
// });

// Active or Block User Controller
const approvedOrRejectedUser = catchAsync(async (req, res) => {
  const user = req.user as AuthUser;
  const result = await AuthServices.approvedOrRejectedUser(
    req.params.email,
    req.body,
    user
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: result?.message,
    data: null,
  });
});

// Verify OTP Controller
const verifyOtp = catchAsync(async (req, res) => {
  const { email, otp } = req.body;
  const result = await AuthServices.verifyOtp(email, otp);

  const { accessToken, refreshToken, message } = result;

  res.cookie('refreshToken', refreshToken, {
    secure: config.NODE_ENV === 'production',
    httpOnly: true,
  });

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: message,
    data: { accessToken, refreshToken },
  });
});

// Resend OTP Controller
const resendOtp = catchAsync(async (req, res) => {
  const { email } = req.body;
  const result = await AuthServices.resendOtp(email);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: result?.message,
    data: null,
  });
});

export const AuthControllers = {
  registerUser,
  loginUser,
  logoutUser,
  // changePassword,
  // refreshToken,
  resendOtp,
  verifyOtp,
  approvedOrRejectedUser,
};
