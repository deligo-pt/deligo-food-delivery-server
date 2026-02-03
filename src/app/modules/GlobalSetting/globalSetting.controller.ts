import httpStatus from 'http-status';
import { catchAsync } from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { GlobalSettingsService } from './globalSetting.service';
import { AuthUser } from '../../constant/user.constant';

// create global settings controller
const createGlobalSettings = catchAsync(async (req, res) => {
  const result = await GlobalSettingsService.createGlobalSettings(
    req.body,
    req.user as AuthUser,
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: 'Global settings created successfully',
    data: result,
  });
});

// update global settings controller
const updateGlobalSettings = catchAsync(async (req, res) => {
  const result = await GlobalSettingsService.updateGlobalSettings(
    req.body,
    req.user as AuthUser,
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Global settings updated successfully',
    data: result,
  });
});

// get global settings for admin controller
const getGlobalSettingsForAdmin = catchAsync(async (req, res) => {
  const result = await GlobalSettingsService.getGlobalSettingsForAdmin(
    req.user as AuthUser,
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Global settings fetched successfully',
    data: result,
  });
});

export const GlobalSettingControllers = {
  createGlobalSettings,
  updateGlobalSettings,
  getGlobalSettingsForAdmin,
};
