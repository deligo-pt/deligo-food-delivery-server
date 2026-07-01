import httpStatus from 'http-status';
import { catchAsync } from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { GlobalSettingsService } from './globalSetting.service';
import { TCurrentUser } from '../../constant/GlobalInterface/user.interface';
import { TMessageKey } from '../../errors/messages';

// create global settings controller
const createGlobalSettings = catchAsync(async (req, res) => {
  const result = await GlobalSettingsService.createGlobalSettings(
    req.body,
    req.user as TCurrentUser,
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    messageKey: result?.messageKey as TMessageKey,
    data: result?.data,
  });
});

// update global settings controller
const updateGlobalSettings = catchAsync(async (req, res) => {
  const result = await GlobalSettingsService.updateGlobalSettings(
    req.body,
    req.user as TCurrentUser,
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: result?.messageKey as TMessageKey,
    data: result?.data,
  });
});

// get global settings for admin controller
const getGlobalSettingsForAdmin = catchAsync(async (req, res) => {
  const result = await GlobalSettingsService.getGlobalSettingsForAdmin(
    req.user as TCurrentUser,
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: result?.messageKey as TMessageKey,
    data: result?.data,
  });
});

export const GlobalSettingControllers = {
  createGlobalSettings,
  updateGlobalSettings,
  getGlobalSettingsForAdmin,
};
