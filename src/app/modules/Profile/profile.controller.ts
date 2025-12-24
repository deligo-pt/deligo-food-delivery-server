import { Request, Response } from 'express';
import { catchAsync } from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import httpStatus from 'http-status';
import { ProfileServices } from './profile.service';
import { TImageFile } from '../../interfaces/image.interface';
import { AuthUser } from '../../constant/user.constant';

// get my profile controller
const getMyProfile = catchAsync(async (req: Request, res: Response) => {
  const result = await ProfileServices.getMyProfile(req.user as AuthUser);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'My Profile Retrieve Successfully',
    data: result,
  });
});

// update my profile controller
const updateMyProfile = catchAsync(async (req, res) => {
  const file = req.file as TImageFile | undefined;
  const result = await ProfileServices.updateMyProfile(
    req.user as AuthUser,
    file?.path ?? null,
    req?.body
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Profile updated successfully',
    data: result,
  });
});

// send otp controller
const sendOtp = catchAsync(async (req, res) => {
  const result = await ProfileServices.sendOtp(req.user as AuthUser, req.body);
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
    req.user as AuthUser,
    req.body.otp
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
  updateMyProfile,
  sendOtp,
  updateEmailOrContactNumber,
};
