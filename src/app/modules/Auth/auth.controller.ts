import httpStatus from 'http-status';
import sendResponse from '../../utils/sendResponse';
import { AuthServices } from './auth.service';
import { catchAsync } from '../../utils/catchAsync';
import { AuthUser } from '../../constant/user.constant';
import config from '../../config';

//register User Controller [Vendor, Fleet Manager, Admin]
const registerUser = catchAsync(async (req, res) => {
  const url = req.originalUrl;
  const result = await AuthServices.registerUser(req.body, url);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result?.message,
    data: result?.data,
  });
});

// register User Controller [Vendor, Fleet Manager, Admin, Sub Vendor, Delivery Partner]
const onboardUser = catchAsync(async (req, res) => {
  const { targetRole } = req.params;
  const result = await AuthServices.onboardUser(
    req.body,
    targetRole,
    req.user as AuthUser,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result?.message,
    data: result?.data,
  });
});

// Login User Controller
const loginUser = catchAsync(async (req, res) => {
  const result = await AuthServices.loginUser(req.body);
  const { refreshToken, accessToken } = result;

  res.cookie('refreshToken', refreshToken, {
    secure: config.NODE_ENV === 'production',
    httpOnly: true,
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result?.message,
    data: {
      accessToken,
      refreshToken,
    },
  });
});

// Login Customer Controller
const loginCustomer = catchAsync(async (req, res) => {
  res.clearCookie('refreshToken');
  const result = await AuthServices.loginCustomer(req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result?.message,
    data: null,
  });
});

// Save FCM Token Controller
const saveFcmToken = catchAsync(async (req, res) => {
  const { token } = req.body;
  const result = await AuthServices.saveFcmToken(req.user as AuthUser, token);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result?.message,
    data: null,
  });
});

// Logout User Controller
const logoutUser = catchAsync(async (req, res) => {
  res.clearCookie('refreshToken');
  const result = await AuthServices.logoutUser(req.user.email, req.body.token);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: result?.message,
    data: null,
  });
});

// Change Password
const changePassword = catchAsync(async (req, res) => {
  const { ...passwordData } = req.body;

  const result = await AuthServices.changePassword(
    req.user as AuthUser,
    passwordData,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Password updated successfully!',
    data: result,
  });
});

// Forgot Password
const forgotPassword = catchAsync(async (req, res) => {
  const { email } = req.body;
  const result = await AuthServices.forgotPassword(email);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result?.message,
    data: null,
  });
});

// Reset Password
const resetPassword = catchAsync(async (req, res) => {
  const { email, token, newPassword } = req.body;
  const result = await AuthServices.resetPassword(email, token, newPassword);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result?.message,
    data: null,
  });
});

// Refresh Token
const refreshToken = catchAsync(async (req, res) => {
  const { refreshToken } = req.cookies;
  const result = await AuthServices.refreshToken(refreshToken);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Access token retrieved successfully!',
    data: result,
  });
});

//  Submit Approval Request Controller
const submitForApproval = catchAsync(async (req, res) => {
  const result = await AuthServices.submitForApproval(
    req.params.userId,
    req.user as AuthUser,
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: result?.message,
    data: null,
  });
});

// Active or Block User Controller
const approvedOrRejectedUser = catchAsync(async (req, res) => {
  const currentUser = req.user as AuthUser;
  const result = await AuthServices.approvedOrRejectedUser(
    req.params.userId,
    req.body,
    currentUser,
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
  const { email, contactNumber, otp } = req.body;
  const result = await AuthServices.verifyOtp(email, contactNumber, otp);

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
  const { email, contactNumber } = req.body;
  const result = await AuthServices.resendOtp(email, contactNumber);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: result?.message,
    data: null,
  });
});

// soft delete user controller
const softDeleteUser = catchAsync(async (req, res) => {
  const result = await AuthServices.softDeleteUser(
    req.params.userId,
    req.user as AuthUser,
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: result?.message,
    data: null,
  });
});

// permanent delete user controller
const permanentDeleteUser = catchAsync(async (req, res) => {
  const result = await AuthServices.permanentDeleteUser(
    req.params.userId,
    req.user as AuthUser,
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: result?.message,
    data: null,
  });
});

export const AuthControllers = {
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
