import httpStatus from 'http-status';
import { catchAsync } from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { AuthUser } from '../../constant/user.constant';
import { FleetManagerServices } from './fleet-manager.service';

// Fleet Manager Update Controller
const fleetManagerUpdate = catchAsync(async (req, res) => {
  const currentUser = req.user as AuthUser;
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
    req.user as AuthUser,
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
  getAllFleetManagers,
  getSingleFleetManager,
};
