import httpStatus from 'http-status';
import AppError from '../../errors/AppError';
import { QueryBuilder } from '../../builder/QueryBuilder';
import { TPermission } from './permission.interface';
import { Permission } from './permission.model';
import { TCurrentUser } from '../../constant/GlobalInterface/user.interface';
import { Admin } from '../Admin/admin.model';

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
        'This permission action code was previously deleted. Please restore it instead of creating a duplicate.',
      );
    }
    throw new AppError(
      httpStatus.CONFLICT,
      'This permission action code already exists and is active!',
    );
  }

  payload.createdBy = currentUser._id;

  const result = await Permission.create(payload);
  return {
    message: 'Permission created successfully',
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
      'Target system permission not found!',
    );
  }

  if (
    permission.isSystemDefined &&
    payload.action &&
    payload.action !== permission.action
  ) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'Security Alert: Core system defined permission action codes cannot be altered!',
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
        `Conflict: Permission action code '${payload.action}' is already registered in another module!`,
      );
    }
  }

  payload.updatedBy = currentUser._id;

  const result = await Permission.findByIdAndUpdate(permissionId, payload, {
    new: true,
    runValidators: true,
  });

  return {
    message: 'Permission updated successfully',
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
    message: 'Permissions retrieved successfully',
    meta,
    data,
  };
};

const getSinglePermission = async (permissionId: string) => {
  const result = await Permission.findById(permissionId);
  if (!result || result.isDeleted) {
    throw new AppError(httpStatus.NOT_FOUND, 'Permission not found!');
  }
  return {
    message: 'Permission details retrieved successfully',
    data: result,
  };
};

const deletePermission = async (permissionId: string) => {
  const permission = await Permission.findById(permissionId);

  if (!permission || permission.isDeleted) {
    throw new AppError(httpStatus.NOT_FOUND, 'Permission not found!');
  }

  if (permission.isSystemDefined) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'Core system permissions cannot be deleted!',
    );
  }

  await Permission.findByIdAndUpdate(
    permissionId,
    { isDeleted: true },
    { new: true },
  );
  return {
    message: 'Permission soft-deleted successfully',
    data: null,
  };
};

const validateIdsAndGetActionCodes = async (
  permissionIds: string[],
): Promise<string[]> => {
  if (!permissionIds || permissionIds.length === 0) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Permission IDs array cannot be empty!',
    );
  }

  const foundPermissions = await Permission.find({
    _id: { $in: permissionIds },
    isDeleted: { $ne: true },
  }).select('action');

  if (foundPermissions.length !== permissionIds.length) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Security Alert: One or more provided Permission IDs are invalid or inactive!',
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
    throw new AppError(httpStatus.NOT_FOUND, 'Target Admin account not found!');
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
    message: 'New permissions assigned to admin successfully',
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
    throw new AppError(httpStatus.NOT_FOUND, 'Target Admin account not found!');
  }

  const userCurrentPermissions = targetAdmin.permissions || [];
  const missingActions = permissionActions.filter(
    (action) => !userCurrentPermissions.includes(action),
  );

  if (missingActions.length > 0) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Revoke failed: The target admin does not currently have these permission(s): [${missingActions.join(', ')}]`,
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
    message: 'Specified permissions revoked from admin successfully',
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
