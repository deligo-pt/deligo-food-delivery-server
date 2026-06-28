import httpStatus from 'http-status';
import { catchAsync } from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { TCurrentUser } from '../../constant/GlobalInterface/user.interface';
import { FleetManagerServices } from './fleet-manager.service';

// Fleet Manager Update Controller
const fleetManagerUpdate = catchAsync(async (req, res) => {
  const currentUser = req.user as TCurrentUser;
  const result = await FleetManagerServices.fleetManagerUpdate(
    req.params.fleetManagerId,
    req.body,
    currentUser,
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: result?.message,
    data: result?.data,
  });
});
//  fleet manager doc image upload controller
const fleetManagerDocImageUpload = catchAsync(async (req, res) => {
  const result = await FleetManagerServices.fleetManagerDocImageUpload(
    req.body,
    req.user as TCurrentUser,
    req.params.fleetManagerId,
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: result?.message,
    data: result?.existingFleetManager,
  });
});

// fleet manager document delete controller
const deleteFleetManagerDocument = catchAsync(async (req, res) => {
  const result = await FleetManagerServices.deleteFleetManagerDocument(
    req.body,
    req.user as TCurrentUser,
    req.params.fleetManagerId,
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: result?.message,
    data: result?.data,
  });
});

// get all fleet managers
const getAllFleetManagers = catchAsync(async (req, res) => {
  const result = await FleetManagerServices.getAllFleetManagersFromDb(
    req.query,
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: result?.message,
    meta: result?.meta,
    data: result?.data,
  });
});

// get single fleet manager
const getSingleFleetManager = catchAsync(async (req, res) => {
  const result = await FleetManagerServices.getSingleFleetManagerFromDB(
    req.params.fleetManagerId,
    req.user as TCurrentUser,
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: result?.message,
    data: result?.data,
  });
});

export const FleetManagerControllers = {
  fleetManagerUpdate,
  fleetManagerDocImageUpload,
  deleteFleetManagerDocument,
  getAllFleetManagers,
  getSingleFleetManager,
};
