import { Request, Response } from 'express';
import { catchAsync } from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import httpStatus from 'http-status';
import { ProfileServices } from './profile.service';
import { TImageFile } from '../../interfaces/image.interface';
import { TCurrentUser } from '../../constant/GlobalInterface/user.interface';

// get my profile controller
const getMyProfile = catchAsync(async (req: Request, res: Response) => {
  const result = await ProfileServices.getMyProfile(req.user as TCurrentUser);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: result?.message,
    data: result?.data,
  });
});

// send otp controller
const sendOtp = catchAsync(async (req, res) => {
  const result = await ProfileServices.sendOtp(
    req.user as TCurrentUser,
    req.body,
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: result?.message,
    data: result?.data,
  });
});

// update email or contact number controller
const updateEmailOrContactNumber = catchAsync(async (req, res) => {
  const result = await ProfileServices.updateEmailOrContactNumber(
    req.user as TCurrentUser,
    req.body,
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: result?.message,
    data: result?.data,
  });
});

export const ProfileController = {
  getMyProfile,
  sendOtp,
  updateEmailOrContactNumber,
};
