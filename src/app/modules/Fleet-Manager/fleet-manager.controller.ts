import httpStatus from 'http-status';
import { catchAsync } from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { TCurrentUser } from '../../constant/GlobalInterface/user.interface';
import { FleetManagerServices } from './fleet-manager.service';
import { TMessageKey } from '../../errors/messages';
import { createActivityLog } from '../ActivityLog/activityLog.utils';

// Fleet Manager Update Controller
const fleetManagerUpdate = catchAsync(async (req, res) => {
  const currentUser = req.user as TCurrentUser;
  const result = await FleetManagerServices.fleetManagerUpdate(
    req.params.fleetManagerId,
    req.body,
    currentUser,
  );

  createActivityLog({
    customUserId: currentUser?.userId,
    action: 'Updated Fleet Manager',
    target: `Fleet Manager #${req.params.fleetManagerId}`,
    type: 'INFO',
  });

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: result?.messageKey as TMessageKey,
    variables: result?.variables,
    data: result?.data,
  });
});
//  fleet manager doc image upload controller
const fleetManagerDocImageUpload = catchAsync(async (req, res) => {
  const currentUser = req.user as TCurrentUser;
  const result = await FleetManagerServices.fleetManagerDocImageUpload(
    req.body,
    currentUser,
    req.params.fleetManagerId,
  );

  createActivityLog({
    customUserId: currentUser?.userId,
    action: 'Uploaded Fleet Manager Document',
    target:
      req.body?.docImageTitle || `Fleet Manager #${req.params.fleetManagerId}`,
    type: 'INFO',
  });

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: result?.messageKey as TMessageKey,
    variables: result?.variables,
    data: result?.existingFleetManager,
  });
});

// fleet manager document delete controller
const deleteFleetManagerDocument = catchAsync(async (req, res) => {
  const currentUser = req.user as TCurrentUser;
  const result = await FleetManagerServices.deleteFleetManagerDocument(
    req.body,
    currentUser,
    req.params.fleetManagerId,
  );

  createActivityLog({
    customUserId: currentUser?.userId,
    action: 'Deleted Fleet Manager Document',
    target:
      req.body?.docImageTitle || `Fleet Manager #${req.params.fleetManagerId}`,
    type: 'DANGER',
  });

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: result?.messageKey as TMessageKey,
    variables: result?.variables,
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
    messageKey: result?.messageKey as TMessageKey,
    variables: result?.variables,
    meta: result?.meta,
    data: result?.data,
  });
});

// get single fleet manager
const getSingleFleetManager = catchAsync(async (req, res) => {
  const result = await FleetManagerServices.getSingleFleetManagerFromDB(
    req.params.fleetManagerId,
    req.user as TCurrentUser,
    req.query,
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: result?.messageKey as TMessageKey,
    variables: result?.variables,
    meta: result?.meta,
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
