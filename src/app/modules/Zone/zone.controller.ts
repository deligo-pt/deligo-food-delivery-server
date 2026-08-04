import httpStatus from 'http-status';
import { catchAsync } from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { ZoneService } from './zone.service';
import { TMessageKey } from '../../errors/messages';
import { TCurrentUser } from '../../constant/GlobalInterface/user.interface';
import { createActivityLog } from '../ActivityLog/activityLog.utils';

// Create Zone Controller
const createZoneController = catchAsync(async (req, res) => {
  const currentUser = req.user as TCurrentUser;
  const result = await ZoneService.createZone(req.body);

  createActivityLog({
    customUserId: currentUser?.userId,
    action: 'Created Zone',
    target: req.body?.zoneName || 'New Zone',
    type: 'INFO',
  });

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    messageKey: result?.messageKey as TMessageKey,
    variables: result?.variables,
    data: result?.data,
  });
});

// Check Point in Zone Controller
const checkPointInZoneController = catchAsync(async (req, res) => {
  const lng = parseFloat(req.body.lng as string);
  const lat = parseFloat(req.body.lat as string);
  const result = await ZoneService.getZoneByCoordinates(lng, lat);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    messageKey: result?.messageKey as TMessageKey,
    variables: result?.variables,
    data: result?.data,
  });
});

// get all zones controller
const getAllZonesController = catchAsync(async (req, res) => {
  const result = await ZoneService.getAllZones(req.query);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    messageKey: result?.messageKey as TMessageKey,
    variables: result?.variables,
    meta: result?.meta,
    data: result?.data,
  });
});

// get single zone controller
const getSingleZoneController = catchAsync(async (req, res) => {
  const { zoneId } = req.params;
  const result = await ZoneService.getSingleZone(zoneId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    messageKey: result?.messageKey as TMessageKey,
    variables: result?.variables,
    data: result?.data,
  });
});

// update zone controller
const updateZoneController = catchAsync(async (req, res) => {
  const { zoneId } = req.params;
  const currentUser = req.user as TCurrentUser;
  const result = await ZoneService.updateZone(zoneId, req.body);

  createActivityLog({
    customUserId: currentUser?.userId,
    action: 'Updated Zone',
    target: req.body?.zoneName || `Zone #${zoneId}`,
    type: 'INFO',
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    messageKey: result?.messageKey as TMessageKey,
    variables: result?.variables,
    data: result?.data,
  });
});

// toggle zone status controller
const toggleZoneStatusController = catchAsync(async (req, res) => {
  const { zoneId } = req.params;
  const isOperational = req.body.isOperational;
  const currentUser = req.user as TCurrentUser;
  const result = await ZoneService.toggleZoneStatus(zoneId, isOperational);

  createActivityLog({
    customUserId: currentUser?.userId,
    action: 'Toggled Zone Operational Status',
    target: `Zone #${zoneId}`,
    type: 'WARNING',
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    messageKey: result?.messageKey as TMessageKey,
    variables: result?.variables,
    data: result?.data,
  });
});

// soft delete zone controller
const softDeleteZoneController = catchAsync(async (req, res) => {
  const { zoneId } = req.params;
  const currentUser = req.user as TCurrentUser;
  const result = await ZoneService.softDeleteZone(zoneId);

  createActivityLog({
    customUserId: currentUser?.userId,
    action: 'Soft Deleted Zone',
    target: `Zone #${zoneId}`,
    type: 'DANGER',
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    messageKey: result?.messageKey as TMessageKey,
    variables: result?.variables,
    data: result?.data,
  });
});

// permanent delete zone controller
const permanentDeleteZoneController = catchAsync(async (req, res) => {
  const { zoneId } = req.params;
  const currentUser = req.user as TCurrentUser;
  const result = await ZoneService.permanentDeleteZone(zoneId);

  createActivityLog({
    customUserId: currentUser?.userId,
    action: 'Permanently Deleted Zone',
    target: `Zone #${zoneId}`,
    type: 'DANGER',
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    messageKey: result?.messageKey as TMessageKey,
    variables: result?.variables,
    data: result?.data,
  });
});

export const ZoneController = {
  createZoneController,
  checkPointInZoneController,
  getAllZonesController,
  getSingleZoneController,
  updateZoneController,
  toggleZoneStatusController,
  softDeleteZoneController,
  permanentDeleteZoneController,
};
