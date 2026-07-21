import httpStatus from 'http-status';
import { catchAsync } from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { ActivityLogServices } from './activityLog.service';
import { TMessageKey } from '../../errors/messages';

const getAllActivityLogs = catchAsync(async (req, res) => {
  const result = await ActivityLogServices.getAllActivityLogs(req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    messageKey: result?.messageKey as TMessageKey,
    variables: result?.variables,
    meta: result.meta,
    data: result.data,
  });
});

const getSingleActivityLog = catchAsync(async (req, res) => {
  const { id } = req.params;
  const result = await ActivityLogServices.getSingleActivityLog(id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    messageKey: result?.messageKey as TMessageKey,
    variables: result?.variables,
    data: result.data,
  });
});

export const ActivityLogControllers = {
  getAllActivityLogs,
  getSingleActivityLog,
};
