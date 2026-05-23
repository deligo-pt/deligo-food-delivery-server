import httpStatus from 'http-status';
import { catchAsync } from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { PermissionServices } from './permission.service';

const seedPermissions = catchAsync(async (req, res) => {
  const result = await PermissionServices.seedInitialPermissions();

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: result.message,
    data: result,
  });
});

const createPermission = catchAsync(async (req, res) => {
  const result = await PermissionServices.createPermission(req.body);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: 'New permission created successfully!',
    data: result,
  });
});

const updatePermission = catchAsync(async (req, res) => {
  const { permissionId } = req.params;
  const result = await PermissionServices.updatePermission(
    permissionId,
    req.body,
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Permission updated successfully!',
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

const revokePermissionsFromUser = catchAsync(async (req, res) => {
  const result = await PermissionServices.revokePermissionsFromUser(req.body);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Permissions revoked from the user successfully!',
    data: result,
  });
});

export const PermissionController = {
  seedPermissions,
  createPermission,
  updatePermission,
  assignPermissionsToUser,
  revokePermissionsFromUser,
};
