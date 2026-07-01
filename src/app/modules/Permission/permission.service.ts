import httpStatus from 'http-status';
import AppError from '../../errors/AppError';
import { QueryBuilder } from '../../builder/QueryBuilder';
import { TPermission } from './permission.interface';
import { Permission } from './permission.model';
import { TCurrentUser } from '../../constant/GlobalInterface/user.interface';
import { Admin } from '../Admin/admin.model';
import { TMessageKey } from '../../errors/messages';

const createPermission = async (
  payload: TPermission,
  currentUser: TCurrentUser,
) => {
  const checkDuplicate = await Permission.findOne({
    action: payload.action,
  });

  if (checkDuplicate) {
    if (checkDuplicate.isDeleted) {
      throw new AppError(
        httpStatus.CONFLICT,
        'PERMISSION_ACTION_PREVIOUSLY_DELETED',
      );
    }
    throw new AppError(httpStatus.CONFLICT, 'PERMISSION_ACTION_ALREADY_ACTIVE');
  }

  payload.createdBy = currentUser._id;

  const result = await Permission.create(payload);
  return {
    messageKey: 'PERMISSION_CREATED_SUCCESS' as TMessageKey,
    data: result,
  };
};

const updatePermission = async (
  permissionId: string,
  payload: Partial<TPermission>,
  currentUser: TCurrentUser,
) => {
  const permission = await Permission.findById(permissionId);
  if (!permission || permission.isDeleted) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      'TARGET_SYSTEM_PERMISSION_NOT_FOUND',
    );
  }

  if (
    permission.isSystemDefined &&
    payload.action &&
    payload.action !== permission.action
  ) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'SYSTEM_PERMISSION_ACTION_IMMUTABLE',
    );
  }

  if (payload.action && payload.action !== permission.action) {
    const isActionTaken = await Permission.findOne({
      action: payload.action,
      isDeleted: { $ne: true },
    });
    if (isActionTaken) {
      throw new AppError(
        httpStatus.CONFLICT,
        'PERMISSION_ACTION_ALREADY_REGISTERED_IN_MODULE',
        { action: payload.action },
      );
    }
  }

  payload.updatedBy = currentUser._id;

  const result = await Permission.findByIdAndUpdate(permissionId, payload, {
    new: true,
    runValidators: true,
  });

  return {
    messageKey: 'PERMISSION_UPDATED_SUCCESS' as TMessageKey,
    data: result,
  };
};

const getAllPermissions = async (query: Record<string, unknown>) => {
  const permissionQuery = new QueryBuilder(
    Permission.find({ isDeleted: { $ne: true } }),
    query,
  )
    .search(['name', 'action', 'module', 'displayName', 'description'])
    .filter()
    .sort()
    .paginate()
    .fields();

  const meta = await permissionQuery.countTotal();
  const data = await permissionQuery.modelQuery;

  return {
    messageKey: 'PERMISSIONS_RETRIEVED_SUCCESS' as TMessageKey,
    meta,
    data,
  };
};

const getSinglePermission = async (permissionId: string) => {
  const result = await Permission.findById(permissionId);
  if (!result || result.isDeleted) {
    throw new AppError(httpStatus.NOT_FOUND, 'PERMISSION_NOT_FOUND');
  }
  return {
    messageKey: 'PERMISSION_DETAILS_RETRIEVED_SUCCESS' as TMessageKey,
    data: result,
  };
};

const deletePermission = async (permissionId: string) => {
  const permission = await Permission.findById(permissionId);

  if (!permission || permission.isDeleted) {
    throw new AppError(httpStatus.NOT_FOUND, 'PERMISSION_NOT_FOUND');
  }

  if (permission.isSystemDefined) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'CORE_SYSTEM_PERMISSIONS_CANNOT_BE_DELETED',
    );
  }

  await Permission.findByIdAndUpdate(
    permissionId,
    { isDeleted: true },
    { new: true },
  );
  return {
    messageKey: 'PERMISSION_SOFT_DELETED_SUCCESS' as TMessageKey,
    data: null,
  };
};

const validateIdsAndGetActionCodes = async (
  permissionIds: string[],
): Promise<string[]> => {
  if (!permissionIds || permissionIds.length === 0) {
    throw new AppError(httpStatus.BAD_REQUEST, 'PERMISSION_IDS_ARRAY_EMPTY');
  }

  const foundPermissions = await Permission.find({
    _id: { $in: permissionIds },
    isDeleted: { $ne: true },
  }).select('action');

  if (foundPermissions.length !== permissionIds.length) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'INVALID_OR_INACTIVE_PERMISSION_IDS',
    );
  }

  return foundPermissions.map((p) => p.action);
};

const assignPermissionsToAdmin = async (
  targetAdminCustomId: string,
  payload: { permissionIds: string[] },
) => {
  const targetAdmin = await Admin.findOne({
    userId: targetAdminCustomId,
    isDeleted: false,
  });
  if (!targetAdmin) {
    throw new AppError(httpStatus.NOT_FOUND, 'TARGET_ADMIN_NOT_FOUND');
  }

  const actionCodes = await validateIdsAndGetActionCodes(payload.permissionIds);

  const result = await Admin.findOneAndUpdate(
    { userId: targetAdminCustomId },
    {
      $addToSet: {
        permissions: { $each: actionCodes },
      },
    },
    { new: true, runValidators: true },
  ).select('-password');

  return {
    messageKey: 'NEW_PERMISSIONS_ASSIGNED_SUCCESS' as TMessageKey,
    data: result,
  };
};

const revokePermissionsFromAdmin = async (
  targetAdminCustomId: string,
  payload: { permissionActions: string[] },
) => {
  const { permissionActions } = payload;
  const targetAdmin = await Admin.findOne({
    userId: targetAdminCustomId,
    isDeleted: false,
  });
  if (!targetAdmin) {
    throw new AppError(httpStatus.NOT_FOUND, 'TARGET_ADMIN_NOT_FOUND');
  }

  const userCurrentPermissions = targetAdmin.permissions || [];
  const missingActions = permissionActions.filter(
    (action) => !userCurrentPermissions.includes(action),
  );

  if (missingActions.length > 0) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'REVOKE_FAILED_MISSING_PERMISSIONS',
      { missingActions: missingActions.join(', ') },
    );
  }

  const result = await Admin.findOneAndUpdate(
    { userId: targetAdminCustomId },
    {
      $pull: {
        permissions: { $in: permissionActions },
      },
    },
    { new: true, runValidators: true },
  ).select('-password');

  return {
    messageKey: 'SPECIFIED_PERMISSIONS_REVOKED_SUCCESS' as TMessageKey,
    data: result,
  };
};

export const PermissionServices = {
  createPermission,
  updatePermission,
  getAllPermissions,
  getSinglePermission,
  deletePermission,
  assignPermissionsToAdmin,
  revokePermissionsFromAdmin,
};
