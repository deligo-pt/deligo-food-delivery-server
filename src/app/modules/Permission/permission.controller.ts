import httpStatus from 'http-status';
import { catchAsync } from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { PermissionServices } from './permission.service';

const seedPermissions = catchAsync(async (req, res) => {
  const result = await PermissionServices.seedInitialPermissionsIntoDB();

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: result.message,
    data: result,
  });
});

const assignPermissionsToUser = catchAsync(async (req, res) => {
  const result = await PermissionServices.assignPermissionsToUser(req.body);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Permissions assigned to the user successfully!',
    data: result,
  });
});

export const PermissionController = {
  seedPermissions,
  assignPermissionsToUser,
};
