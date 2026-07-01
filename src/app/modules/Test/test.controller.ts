import httpStatus from 'http-status';
import sendResponse from '../../utils/sendResponse';
import { catchAsync } from '../../utils/catchAsync';
import { TestService } from './test.service';
import { TMessageKey } from '../../errors/messages';

const getNotificationByToken = catchAsync(async (req, res) => {
  const result = await TestService.getNotificationByToken(req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    messageKey: result?.messageKey as TMessageKey,
    data: result?.data,
  });
});

export const TestController = {
  getNotificationByToken,
};
