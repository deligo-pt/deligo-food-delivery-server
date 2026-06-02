import { Request, Response } from 'express';
import { catchAsync } from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import httpStatus from 'http-status';
import { ProfileServices } from './profile.service';
import { TImageFile } from '../../interfaces/image.interface';
import { TAuthUser } from '../AuthUser/authUser.interface';

// get my profile controller
const getMyProfile = catchAsync(async (req: Request, res: Response) => {
  const result = await ProfileServices.getMyProfile(req.user as TAuthUser);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'My Profile Retrieve Successfully',
    data: result,
  });
});

// send otp controller
const sendOtp = catchAsync(async (req, res) => {
  const result = await ProfileServices.sendOtp(req.user as TAuthUser, req.body);
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: result?.message,
    data: null,
  });
});

// update email or contact number controller
const updateEmailOrContactNumber = catchAsync(async (req, res) => {
  const result = await ProfileServices.updateEmailOrContactNumber(
    req.user as TAuthUser,
    req.body.otp,
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: result?.message,
    data: null,
  });
});

export const ProfileController = {
  getMyProfile,
  sendOtp,
  updateEmailOrContactNumber,
};
