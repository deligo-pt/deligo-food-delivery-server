import httpStatus from 'http-status';
import { AuthUser } from '../../constant/user.constant';
import { catchAsync } from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { SosService } from './sos.service';

// Controller logic snippet
const triggerSos = catchAsync(async (req, res) => {
  const result = await SosService.triggerSos(req.body, req.user as AuthUser);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: 'SOS triggered successfully. Help is on the way!',
    data: result,
  });
});

// update sos status controller
const updateSosStatus = catchAsync(async (req, res) => {
  const sosId = req.params.id;
  const adminId = (req.user as AuthUser)._id.toString();
  const result = await SosService.updateSosStatus(sosId, adminId, req.body);
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'SOS status updated successfully',
    data: result,
  });
});

const getNearbySosAlerts = catchAsync(async (req, res) => {
  const result = await SosService.getNearbySosAlerts(req.user as AuthUser);
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Nearby SOS alerts retrieved successfully',
    data: result,
  });
});

// get all sos alerts controller
const getAllSosAlerts = catchAsync(async (req, res) => {
  const result = await SosService.getAllSosAlerts(
    req.query,
    req.user as AuthUser,
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'SOS alerts retrieved successfully',
    data: result,
  });
});

// get single sos alert controller
const getSingleSosAlert = catchAsync(async (req, res) => {
  const result = await SosService.getSingleSosAlert(req.params.id);
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'SOS alert retrieved successfully',
    data: result,
  });
});

// get sos alerts by user id controller
const getUserSosHistory = catchAsync(async (req, res) => {
  const result = await SosService.getUserSosHistory(
    req.user as AuthUser,
    req.params.id,
    req.query,
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'SOS alerts retrieved successfully',
    data: result,
  });
});

export const SosController = {
  triggerSos,
  updateSosStatus,
  getNearbySosAlerts,
  getAllSosAlerts,
  getSingleSosAlert,
  getUserSosHistory,
};
