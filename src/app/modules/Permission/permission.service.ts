import httpStatus from 'http-status';
import AppError from '../../errors/AppError';
import { QueryBuilder } from '../../builder/QueryBuilder';
import { TPermission } from './permission.interface';
import { Permission } from './permission.model';
import { AuthUser } from '../../constant/GlobalInterface/user.interface';

const createPermissionIntoDB = async (
  payload: TPermission,
  currentUser: AuthUser,
) => {
  const isPermissionExist = await Permission.findOne({
    action: payload.action,
  });
  if (isPermissionExist) {
    throw new AppError(
      httpStatus.CONFLICT,
      'This permission action code already exists!',
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

export const PermissionServices = {
  createPermissionIntoDB,
  getAllPermissionsFromDB,
  getSinglePermissionFromDB,
  updatePermissionInDB,
  deletePermissionFromDB,
};
