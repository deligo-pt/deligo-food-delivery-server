import httpStatus from 'http-status';
import { TCurrentUser } from '../../constant/GlobalInterface/user.interface';
import { catchAsync } from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { SosService } from './sos.service';
import { TMessageKey } from '../../errors/messages';
import { createActivityLog } from '../ActivityLog/activityLog.utils';

// Controller logic snippet
const triggerSos = catchAsync(async (req, res) => {
  const result = await SosService.triggerSos(
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

// update sos status controller
const updateSosStatus = catchAsync(async (req, res) => {
  const sosId = req.params.id;
  const currentUser = req.user as TCurrentUser;
  const adminId = currentUser._id.toString();
  const result = await SosService.updateSosStatus(sosId, adminId, req.body);

  createActivityLog({
    customUserId: currentUser?.userId,
    action: 'Updated SOS Status',
    target: `SOS Alert #${sosId}${req.body?.status ? ` (${req.body.status})` : ''}`,
    type: 'WARNING',
  });

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: result?.messageKey as TMessageKey,
    data: result?.data,
  });
});

const getNearbySosAlerts = catchAsync(async (req, res) => {
  const result = await SosService.getNearbySosAlerts(req.user as TCurrentUser);
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: result?.messageKey as TMessageKey,
    data: result?.data,
  });
});

// get all sos alerts controller
const getAllSosAlerts = catchAsync(async (req, res) => {
  const result = await SosService.getAllSosAlerts(
    req.query,
    req.user as TCurrentUser,
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: result?.messageKey as TMessageKey,
    meta: result?.meta,
    data: result?.data,
  });
});

// get single sos alert controller
const getSingleSosAlert = catchAsync(async (req, res) => {
  const result = await SosService.getSingleSosAlert(
    req.params.id,
    req.user as TCurrentUser,
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: result?.messageKey as TMessageKey,
    data: result?.data,
  });
});

// get sos alerts by user id controller
const getUserSosHistory = catchAsync(async (req, res) => {
  const result = await SosService.getUserSosHistory(
    req.user as TCurrentUser,
    req.params.id,
    req.query,
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: result?.messageKey as TMessageKey,
    meta: result?.meta,
    data: result?.data,
  });
});

// get sos stats controller
const getSosStats = catchAsync(async (req, res) => {
  const result = await SosService.getSosStats(req.user as TCurrentUser);
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: result?.messageKey as TMessageKey,
    data: result?.data,
  });
});

export const SosController = {
  triggerSos,
  updateSosStatus,
  getNearbySosAlerts,
  getAllSosAlerts,
  getSingleSosAlert,
  getUserSosHistory,
  getSosStats,
};
