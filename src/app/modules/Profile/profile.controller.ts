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

export const ProfileController = {
  getMyProfile,
  updateMyProfile,
};
