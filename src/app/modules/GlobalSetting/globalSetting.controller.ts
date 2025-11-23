import httpStatus from 'http-status';
import { catchAsync } from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { GlobalSettingServices } from './globalSetting.service';

const getPerMeterRate = catchAsync(async (req, res) => {
  const result = await GlobalSettingServices.getPerMeterRate();
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Per meter rate fetched successfully',
    data: result,
  });
});

export const GlobalSettingControllers = {
  getPerMeterRate,
};
