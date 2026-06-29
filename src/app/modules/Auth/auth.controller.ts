import httpStatus from 'http-status';
import sendResponse from '../../utils/sendResponse';
import { AuthServices } from './auth.service';
import { catchAsync } from '../../utils/catchAsync';
import config from '../../config';
import { TCurrentUser } from '../../constant/GlobalInterface/user.interface';

//register User Controller [Vendor, Fleet Manager, Admin]
const registerUser = catchAsync(async (req, res) => {
  const result = await AuthServices.registerUser(req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    messageKey: result?.messageKey,
    variables: result?.variables,
    data: result?.data,
  });
});

// register User Controller [Vendor, Fleet Manager, Admin, Sub Vendor, Delivery Partner]
const onboardUser = catchAsync(async (req, res) => {
  const result = await AuthServices.onboardUser(
    req.body,
    req.user as TCurrentUser,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    messageKey: result?.messageKey,
    variables: result?.variables,
    data: result?.data,
  });
});

// Verify OTP Controller
const verifyOtp = catchAsync(async (req, res) => {
  const result = await AuthServices.verifyOtp(req.body);

  const { accessToken, refreshToken } = result;

  res.cookie('refreshToken', refreshToken, {
    secure: config.NODE_ENV === 'production',
    httpOnly: true,
  });

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: result?.messageKey,
    variables: result?.variables,
    data: { accessToken, refreshToken },
  });
});

// Resend OTP Controller
const resendOtp = catchAsync(async (req, res) => {
  const result = await AuthServices.resendOtp(req.body);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: result?.messageKey,
    data: null,
  });
});

// Login User Controller
const loginUser = catchAsync(async (req, res) => {
  const result = await AuthServices.loginUser({
    ...req.body,
    deviceDetails: {
      ...req.body.deviceDetails,
      ip: req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress,
    },
  });
  const { refreshToken, accessToken } = result;

  res.cookie('refreshToken', refreshToken, {
    secure: config.NODE_ENV === 'production',
    httpOnly: true,
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    messageKey: result?.messageKey,
    variables: result?.variables,
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
    messageKey: result?.messageKey,
    data: null,
  });
});

// Update FCM Token Controller
const updateFcmToken = catchAsync(async (req, res) => {
  const result = await AuthServices.updateFcmToken(
    req.user as TCurrentUser,
    req.body,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    messageKey: result?.messageKey,
    data: null,
  });
});

// Logout User Controller
const logoutUser = catchAsync(async (req, res) => {
  res.clearCookie('refreshToken');
  const result = await AuthServices.logoutUser(
    req.user as TCurrentUser,
    req.body.deviceId,
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: result?.messageKey,
    variables: result?.variables,
    data: null,
  });
});

// Change Password
const changePassword = catchAsync(async (req, res) => {
  const { ...passwordData } = req.body;

  const result = await AuthServices.changePassword(
    req.user as TCurrentUser,
    passwordData,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    messageKey: result?.messageKey,
    data: null,
  });
});

// Forgot Password
const forgotPassword = catchAsync(async (req, res) => {
  const result = await AuthServices.forgotPassword(req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    messageKey: result?.messageKey,
    data: null,
  });
});

// Reset Password
const resetPassword = catchAsync(async (req, res) => {
  const result = await AuthServices.resetPassword(req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    messageKey: result?.messageKey,
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
    messageKey: result?.messageKey,
    data: result,
  });
});

//  Submit Approval Request Controller
const submitForApproval = catchAsync(async (req, res) => {
  const result = await AuthServices.submitForApproval(
    req.params.userId,
    req.user as TCurrentUser,
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: result?.messageKey,
    variables: result?.variables,
    data: null,
  });
});

// Active or Block User Controller
const approvedOrRejectedUser = catchAsync(async (req, res) => {
  const currentUser = req.user as TCurrentUser;
  const result = await AuthServices.approvedOrRejectedUser(
    req.params.userId,
    req.body,
    currentUser,
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: result?.messageKey,
    variables: result?.variables,
    data: null,
  });
});

// soft delete user controller
const softDeleteUser = catchAsync(async (req, res) => {
  const result = await AuthServices.softDeleteUser(
    req.params.userId,
    req.user as TCurrentUser,
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: result?.messageKey,
    variables: result?.variables,
    data: null,
  });
});

// permanent delete user controller
const permanentDeleteUser = catchAsync(async (req, res) => {
  const result = await AuthServices.permanentDeleteUser(
    req.params.userId,
    req.user as TCurrentUser,
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: result?.messageKey,
    variables: result?.variables,
    data: null,
  });
});

export const AuthControllers = {
  registerUser,
  onboardUser,
  verifyOtp,
  resendOtp,
  loginUser,
  loginCustomer,
  updateFcmToken,
  logoutUser,
  changePassword,
  forgotPassword,
  resetPassword,
  refreshToken,
  approvedOrRejectedUser,
  submitForApproval,
  softDeleteUser,
  permanentDeleteUser,
};
