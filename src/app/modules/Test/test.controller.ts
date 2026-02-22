import httpStatus from 'http-status';
import sendResponse from '../../utils/sendResponse';
import { catchAsync } from '../../utils/catchAsync';
import { TestService } from './test.service';

const getNotificationByToken = catchAsync(async (req, res) => {
  const result = await TestService.getNotificationByToken(req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result?.message,
    data: result?.data,
  });
});

export const TestController = {
  getNotificationByToken,
};
