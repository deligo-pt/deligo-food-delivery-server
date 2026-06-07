import httpStatus from 'http-status';
import { catchAsync } from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { PermissionServices } from './permission.service';
import { TCurrentUser } from '../../constant/GlobalInterface/user.interface';

const createPermission = catchAsync(async (req, res) => {
  const result = await PermissionServices.createPermission(
    req.body,
    req.user as TCurrentUser,
  );

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Permission created successfully',
    data: result,
  });
});

const updatePermission = catchAsync(async (req, res) => {
  const { permissionId } = req.params;
  const result = await PermissionServices.updatePermission(
    permissionId,
    req.body,
    req.user as TCurrentUser,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Permission updated successfully',
    data: result,
  });
});

const getAllPermissions = catchAsync(async (req, res) => {
  const result = await PermissionServices.getAllPermissions(req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Permissions retrieved successfully',
    meta: result.meta,
    data: result.data,
  });
});

const getSinglePermission = catchAsync(async (req, res) => {
  const { permissionId } = req.params;
  const result = await PermissionServices.getSinglePermission(permissionId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Permission details retrieved successfully',
    data: result,
  });
});

const deletePermission = catchAsync(async (req, res) => {
  const { permissionId } = req.params;
  await PermissionServices.deletePermission(permissionId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Permission soft-deleted successfully',
    data: null,
  });
});

const assignPermissionsToAdmin = catchAsync(async (req, res) => {
  const { adminId } = req.params;
  const result = await PermissionServices.assignPermissionsToAdmin(
    adminId,
    req.body,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'New permissions assigned to admin successfully',
    data: result,
  });
});

const revokePermissionsFromAdmin = catchAsync(async (req, res) => {
  const { adminId } = req.params;
  const result = await PermissionServices.revokePermissionsFromAdmin(
    adminId,
    req.body,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Specified permissions revoked from admin successfully',
    data: result,
  });
});

export const PermissionControllers = {
  createPermission,
  getAllPermissions,
  getSinglePermission,
  updatePermission,
  deletePermission,
  assignPermissionsToAdmin,
  revokePermissionsFromAdmin,
};
