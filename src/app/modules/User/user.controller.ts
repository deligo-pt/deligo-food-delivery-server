import httpStatus from 'http-status';
import { catchAsync } from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { UserServices } from './user.service';

// Customer Registration Controller
const customerRegister = catchAsync(async (req, res) => {
  const result = await UserServices.createCustomer(req.body);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: result?.message,
    data: result?.user,
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

const getAllUsers = catchAsync(async (req, res) => {
  const users = await UserServices.getAllUsersFromDB(req.query);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Users Retrieved Successfully',
    data: users,
  });
});

const getSingleUser = catchAsync(async (req, res) => {
  const user = await UserServices.getSingleUserFromDB(req.params.id);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'User Retrieved Successfully',
    data: user,
  });
});

export const UserControllers = {
  customerRegister,
  verifyOtp,
  resendOtp,
  getSingleUser,
  getAllUsers,
};
