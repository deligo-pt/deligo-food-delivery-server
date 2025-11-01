import httpStatus from 'http-status';
import { catchAsync } from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { UserServices } from './user.service';
import { AuthUser } from '../../constant/user.const';

// User Registration Controller
const userRegister = catchAsync(async (req, res) => {
  const url = req.originalUrl;
  const result = await UserServices.createUser(req.body, url);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: result?.message,
    data: result?.data,
  });
});

// User Update Controller
const updateUser = catchAsync(async (req, res) => {
  const user = req.user as AuthUser;
  const result = await UserServices.updateUser(req.body, req.params.id, user);
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'User update successfully',
    data: result,
  });
});

// Active or Block User Controller
const activateOrBlockUser = catchAsync(async (req, res) => {
  const user = req.user as AuthUser;
  const result = await UserServices.activateOrBlockUser(
    req.params.id,
    req.body,
    user
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'User status updated successfully',
    data: result,
  });
});

// Verify OTP Controller
const verifyOtp = catchAsync(async (req, res) => {
  const { email, otp } = req.body;
  const result = await UserServices.verifyOtp(email, otp);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: result?.message,
    data: { accessToken: result?.accessToken },
  });
});

// Resend OTP Controller
const resendOtp = catchAsync(async (req, res) => {
  const { email } = req.body;
  const result = await UserServices.resendOtp(email);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: result?.message,
    data: null,
  });
});

// get all users
const getAllUsers = catchAsync(async (req, res) => {
  const users = await UserServices.getAllUsersFromDB(req.query);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Users Retrieved Successfully',
    data: users,
  });
});

// get single user
const getSingleUser = catchAsync(async (req, res) => {
  const user = await UserServices.getSingleUserFromDB(
    req.params.id,
    req.user as AuthUser
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'User Retrieved Successfully',
    data: user,
  });
});

export const UserControllers = {
  userRegister,
  updateUser,
  activateOrBlockUser,
  verifyOtp,
  resendOtp,
  getSingleUser,
  getAllUsers,
};
