import httpStatus from 'http-status';
import { catchAsync } from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { FleetManagerServices } from './fleet-manager.service';
import { TAuthUser } from '../AuthUser/authUser.interface';

// Fleet Manager Update Controller
const fleetManagerUpdate = catchAsync(async (req, res) => {
  const currentUser = req.user as TAuthUser;
  const result = await FleetManagerServices.fleetManagerUpdate(
    req.params.fleetManagerId,
    req.body,
    currentUser,
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Fleet Manager updated successfully',
    data: result,
  });
});
//  fleet manager doc image upload controller
const fleetManagerDocImageUpload = catchAsync(async (req, res) => {
  const result = await FleetManagerServices.fleetManagerDocImageUpload(
    req.body,
    req.user as TAuthUser,
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
    req.user as TAuthUser,
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
    message: 'Fleet Managers Retrieved Successfully',
    meta: result?.meta,
    data: result?.data,
  });
});

// get single fleet manager
const getSingleFleetManager = catchAsync(async (req, res) => {
  const result = await FleetManagerServices.getSingleFleetManagerFromDB(
    req.params.fleetManagerId,
    req.user as TAuthUser,
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Fleet Manager Retrieved Successfully',
    data: result,
  });
});

export const FleetManagerControllers = {
  fleetManagerUpdate,
  fleetManagerDocImageUpload,
  deleteFleetManagerDocument,
  getAllFleetManagers,
  getSingleFleetManager,
};
