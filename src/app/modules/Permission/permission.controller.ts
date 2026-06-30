import httpStatus from 'http-status';
import { catchAsync } from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { PermissionServices } from './permission.service';
import { TCurrentUser } from '../../constant/GlobalInterface/user.interface';
import { TMessageKey } from '../../errors/messages';

const createPermission = catchAsync(async (req, res) => {
  const result = await PermissionServices.createPermission(
    req.body,
    req.user as TCurrentUser,
  );

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    messageKey: result?.messageKey as TMessageKey,
    data: result?.data,
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
    messageKey: result?.messageKey as TMessageKey,
    data: result?.data,
  });
});

const getAllPermissions = catchAsync(async (req, res) => {
  const result = await PermissionServices.getAllPermissions(req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    messageKey: result?.messageKey as TMessageKey,
    meta: result?.meta,
    data: result?.data,
  });
});

const getSinglePermission = catchAsync(async (req, res) => {
  const { permissionId } = req.params;
  const result = await PermissionServices.getSinglePermission(permissionId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    messageKey: result?.messageKey as TMessageKey,
    data: result?.data,
  });
});

const deletePermission = catchAsync(async (req, res) => {
  const { permissionId } = req.params;
  const result = await PermissionServices.deletePermission(permissionId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    messageKey: result?.messageKey as TMessageKey,
    data: result?.data,
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
    messageKey: result?.messageKey as TMessageKey,
    data: result?.data,
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
    messageKey: result?.messageKey as TMessageKey,
    data: result?.data,
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
