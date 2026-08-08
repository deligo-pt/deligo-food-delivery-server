import { Request, Response } from 'express';
import { catchAsync } from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import httpStatus from 'http-status';
import { ProfileServices } from './profile.service';
import { TCurrentUser } from '../../constant/GlobalInterface/user.interface';
import { TMessageKey } from '../../errors/messages';
import { formatVendorResponse } from '../Vendor/vendor.utils';
import { createActivityLog } from '../ActivityLog/activityLog.utils';

// get my profile controller
const getMyProfile = catchAsync(async (req: Request, res: Response) => {
  const currentUser = req.user as TCurrentUser;
  const result = await ProfileServices.getMyProfile(currentUser);

  const isVendor = ['VENDOR', 'SUB_VENDOR'].includes(currentUser.role);

  let formattedData;
  if (isVendor) {
    formattedData = formatVendorResponse(result.data, req.lang);
  } else {
    formattedData = result.data;
  }

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: result?.messageKey as TMessageKey,
    variables: result?.variables,
    data: formattedData,
  });
});

// send otp controller
const sendOtp = catchAsync(async (req, res) => {
  const currentUser = req.user as TCurrentUser;
  const result = await ProfileServices.sendOtp(currentUser, req.body);

  createActivityLog({
    customUserId: currentUser?.userId,
    action: 'Sent OTP',
    target: req.body?.email || req.body?.contactNumber || currentUser?.email,
    type: 'WARNING',
  });

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: result?.messageKey as TMessageKey,
    variables: result?.variables,
    data: result?.data,
  });
});

// update email or contact number controller
const updateEmailOrContactNumber = catchAsync(async (req, res) => {
  const currentUser = req.user as TCurrentUser;
  const result = await ProfileServices.updateEmailOrContactNumber(
    currentUser,
    req.body,
  );

  createActivityLog({
    customUserId: currentUser?.userId,
    action: 'Updated Email Or Contact Number',
    target: currentUser?.email || `User #${currentUser?.userId}`,
    type: 'INFO',
  });

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: result?.messageKey as TMessageKey,
    variables: result?.variables,
    data: result?.data,
  });
});

export const ProfileController = {
  getMyProfile,
  sendOtp,
  updateEmailOrContactNumber,
};
