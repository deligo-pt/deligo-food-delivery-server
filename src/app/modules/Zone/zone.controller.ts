import httpStatus from 'http-status';
import { catchAsync } from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { ZoneService } from './zone.service';

// Create Zone Controller
const createZoneController = catchAsync(async (req, res) => {
  const result = await ZoneService.createZone(req.body);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: result?.message,
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
    message: result?.message,
    data: result?.data,
  });
});

// get all zones controller
const getAllZonesController = catchAsync(async (req, res) => {
  const result = await ZoneService.getAllZones(req.query);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result?.message,
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
    message: result?.message,
    data: result?.data,
  });
});

// update zone controller
const updateZoneController = catchAsync(async (req, res) => {
  const { zoneId } = req.params;
  const result = await ZoneService.updateZone(zoneId, req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result?.message,
    data: result?.data,
  });
});

// toggle zone status controller
const toggleZoneStatusController = catchAsync(async (req, res) => {
  const { zoneId } = req.params;
  const isOperational = req.body.isOperational;
  const result = await ZoneService.toggleZoneStatus(zoneId, isOperational);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result?.message,
    data: result?.data,
  });
});

// soft delete zone controller
const softDeleteZoneController = catchAsync(async (req, res) => {
  const { zoneId } = req.params;
  const result = await ZoneService.softDeleteZone(zoneId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result.message,
    data: result?.data,
  });
});

// permanent delete zone controller
const permanentDeleteZoneController = catchAsync(async (req, res) => {
  const { zoneId } = req.params;
  const result = await ZoneService.permanentDeleteZone(zoneId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result.message,
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
