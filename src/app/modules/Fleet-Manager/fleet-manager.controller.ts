import httpStatus from 'http-status';
import { catchAsync } from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { AuthUser } from '../../constant/user.const';
import { FleetManagerServices } from './fleet-manager.service';

// Fleet Manager Update Controller
const fleetManagerUpdate = catchAsync(async (req, res) => {
  const user = req.user as AuthUser;
  const result = await FleetManagerServices.fleetManagerUpdate(
    req.params.id,
    req.body,
    user
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
  const file = req.file;
  const data = JSON.parse(req.body.data);
  const result = await FleetManagerServices.fleetManagerDocImageUpload(
    file?.path,
    data,
    req.user as AuthUser,
    req.params.id
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: result?.message,
    data: result?.existingFleetManager,
  });
});

// submit fleet manager for approval controller
const submitFleetManagerForApproval = catchAsync(async (req, res) => {
  const result = await FleetManagerServices.submitFleetManagerForApproval(
    req.params.id,
    req.user as AuthUser
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: result?.message,
    data: result?.existingFleetManager,
  });
});

// fleet manager delete controller
const fleetManagerDelete = catchAsync(async (req, res) => {
  const result = await FleetManagerServices.fleetManagerDelete(req.params.id);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: result?.message,
    data: null,
  });
});

// get all fleet managers
const getAllFleetManagers = catchAsync(async (req, res) => {
  const users = await FleetManagerServices.getAllFleetManagersFromDb(req.query);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Fleet Managers Retrieved Successfully',
    data: users,
  });
});

// get single fleet manager
const getSingleFleetManager = catchAsync(async (req, res) => {
  const user = await FleetManagerServices.getSingleFleetManagerFromDB(
    req.params.id
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Fleet Manager Retrieved Successfully',
    data: user,
  });
});

export const FleetManagerControllers = {
  fleetManagerUpdate,
  fleetManagerDocImageUpload,
  submitFleetManagerForApproval,
  fleetManagerDelete,
  getAllFleetManagers,
  getSingleFleetManager,
};
