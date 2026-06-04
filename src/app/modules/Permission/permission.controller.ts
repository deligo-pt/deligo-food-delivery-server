import httpStatus from 'http-status';
import { catchAsync } from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { PermissionServices } from './permission.service';
import { AuthUser } from '../../constant/GlobalInterface/user.interface';

const createPermission = catchAsync(async (req, res) => {
  const result = await PermissionServices.createPermission(
    req.body,
    req.user as AuthUser,
  );

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Permission created successfully',
    data: result,
  });
});

const getAllPermissions = catchAsync(async (req, res) => {
  const result = await PermissionServices.getAllPermissionsFromDB(req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Permissions retrieved successfully',
    meta: result.meta,
    data: result.data,
  });
});

const getSinglePermission = catchAsync(async (req, res) => {
  const { id } = req.params;
  const result = await PermissionServices.getSinglePermissionFromDB(id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Permission details retrieved successfully',
    data: result,
  });
});

const updatePermission = catchAsync(async (req, res) => {
  const { id } = req.params;
  const result = await PermissionServices.updatePermissionInDB(id, req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Permission updated successfully',
    data: result,
  });
});

const deletePermission = catchAsync(async (req, res) => {
  const { id } = req.params;
  await PermissionServices.deletePermissionFromDB(id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Permission soft-deleted successfully',
    data: null,
  });
});

export const PermissionControllers = {
  createPermission,
  getAllPermissions,
  getSinglePermission,
  updatePermission,
  deletePermission,
};
