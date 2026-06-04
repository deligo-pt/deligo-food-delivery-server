import httpStatus from 'http-status';
import AppError from '../../errors/AppError';
import { QueryBuilder } from '../../builder/QueryBuilder';
import { TPermission } from './permission.interface';
import { Permission } from './permission.model';
import { AuthUser } from '../../constant/GlobalInterface/user.interface';
import { Admin } from '../Admin/admin.model';

const createPermission = async (
  payload: TPermission,
  currentUser: AuthUser,
) => {
  const isPermissionExist = await Permission.findOne({
    action: payload.action,
  });

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
  return result;
};

const getAllPermissionsFromDB = async (query: Record<string, unknown>) => {
  const permissionQuery = new QueryBuilder(
    Permission.find({ isDeleted: { $ne: true } }),
    query,
  )
    .search(['name', 'action', 'module'])
    .filter()
    .sort()
    .paginate()
    .fields();

  const meta = await permissionQuery.countTotal();
  const data = await permissionQuery.modelQuery;

  return {
    meta,
    data,
  };
};

const getSinglePermissionFromDB = async (id: string) => {
  const result = await Permission.findById(id);
  if (!result || result.isDeleted) {
    throw new AppError(httpStatus.NOT_FOUND, 'Permission not found!');
  }
  return result;
};

const updatePermissionInDB = async (
  id: string,
  payload: Partial<TPermission>,
) => {
  const permission = await Permission.findById(id);

  if (!permission || permission.isDeleted) {
    throw new AppError(httpStatus.NOT_FOUND, 'Permission not found!');
  }

  if (
    permission.isSystemDefined &&
    payload.action &&
    payload.action !== permission.action
  ) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'System defined core action codes cannot be modified.',
    );
  }

  if (payload.action && payload.action !== permission.action) {
    const isActionExist = await Permission.findOne({ action: payload.action });
    if (isActionExist) {
      throw new AppError(
        httpStatus.CONFLICT,
        'This permission action code is already taken!',
      );
    }
  }

  const result = await Permission.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  });
  return result;
};

const deletePermissionFromDB = async (id: string) => {
  const permission = await Permission.findById(id);

  if (!permission || permission.isDeleted) {
    throw new AppError(httpStatus.NOT_FOUND, 'Permission not found!');
  }

  if (permission.isSystemDefined) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'Core system permissions cannot be deleted!',
    );
  }

  const result = await Permission.findByIdAndUpdate(
    id,
    { isDeleted: true },
    { new: true },
  );
  return result;
};

const assignPermissionsToAdminInDB = async (
  targetAdminCustomId: string,
  payload: { permissions: string[] },
) => {
  const targetAdmin = await Admin.findOne({
    userId: targetAdminCustomId,
    isDeleted: false,
  });

  if (!targetAdmin) {
    throw new AppError(httpStatus.NOT_FOUND, 'Admin account not found!');
  }

  if (payload.permissions.length > 0) {
    const validPermissionsCount = await Permission.countDocuments({
      action: { $in: payload.permissions },
      isDeleted: { $ne: true },
    });

    if (validPermissionsCount !== payload.permissions.length) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'One or more permission action codes are invalid or do not exist in the system!',
      );
    }
  }

  const result = await Admin.findOneAndUpdate(
    { userId: targetAdminCustomId },
    {
      $set: {
        permissions: payload.permissions,
      },
    },
    { new: true, runValidators: true },
  ).select('-password');

  return result;
};

export const PermissionServices = {
  createPermission,
  getAllPermissionsFromDB,
  getSinglePermissionFromDB,
  updatePermissionInDB,
  deletePermissionFromDB,
  assignPermissionsToAdminInDB,
};
