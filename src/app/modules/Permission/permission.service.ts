import httpStatus from 'http-status';
import AppError from '../../errors/AppError';
import { AuthUser } from '../AuthUser/authUser.model';
import { Permission } from './permission.model';
import { TPermission } from './permission.interface';

const seedInitialPermissions = async () => {
  const initialPermissions = [
    {
      name: 'VIEW_DELIVERY_PARTNERS',
      subject: 'DeliveryPartner',
      action: 'READ',
      description:
        'Allows reading and viewing the list of all delivery partners/riders.',
    },
    {
      name: 'UPDATE_DELIVERY_PARTNER',
      subject: 'DeliveryPartner',
      action: 'UPDATE',
      description:
        'Allows updating profile details, vehicles, and settings of a delivery partner.',
    },
    {
      name: 'UPLOAD_RIDER_DOCUMENTS',
      subject: 'DeliveryPartner',
      action: 'UPDATE',
      description:
        'Allows uploading and replacing legal document images of a delivery partner.',
    },
    {
      name: 'APPROVE_RIDER_STATUS',
      subject: 'DeliveryPartner',
      action: 'UPDATE',
      description:
        'Allows system admins or managers to approve, reject, or lock a rider account.',
    },

    // 🛍️ Vendor & Store Management Module
    {
      name: 'MANAGE_VENDORS',
      subject: 'Vendor',
      action: 'UPDATE',
      description:
        'Full controller access to create, update, or block food/e-commerce vendors.',
    },

    {
      name: 'MANAGE_ORDERS',
      subject: 'Order',
      action: 'UPDATE',
      description:
        'Allows dispatching, canceling, or updating order status across the platform.',
    },
  ];

  const seededPermissions = [];

  for (const perm of initialPermissions) {
    const isExist = await Permission.findOne({ name: perm.name });
    if (!isExist) {
      const newPerm = await Permission.create(perm);
      seededPermissions.push(newPerm);
    }
  }

  return {
    message: seededPermissions.length
      ? `${seededPermissions.length} new permissions seeded successfully!`
      : 'All system permissions are already up to date!',
    seededCount: seededPermissions.length,
  };
};

const createPermission = async (
  payload: Omit<TPermission, 'name'> & { name?: string },
) => {
  const { action, subject } = payload;

  let generatedName = '';

  if (action === 'READ') {
    generatedName = `VIEW_${subject.toUpperCase()}S`;
  } else {
    generatedName = `${action}_${subject.toUpperCase()}`;
  }

  payload.name = generatedName;

  const isExist = await Permission.findOne({ name: generatedName });
  if (isExist) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `The permission '${generatedName}' already exists!`,
    );
  }

  const result = await Permission.create(payload);
  return result;
};

const updatePermission = async (
  permissionId: string,
  payload: Partial<TPermission>,
) => {
  const isExist = await Permission.findById(permissionId);
  if (!isExist) {
    throw new AppError(httpStatus.NOT_FOUND, 'Permission not found!');
  }

  if (payload.action || payload.subject) {
    const finalAction = payload.action || isExist.action;
    const finalSubject = payload.subject || isExist.subject;

    let newGeneratedName = '';
    if (finalAction === 'READ') {
      newGeneratedName = `VIEW_${finalSubject.toUpperCase()}S`;
    } else {
      newGeneratedName = `${finalAction}_${finalSubject.toUpperCase()}`;
    }

    payload.name = newGeneratedName;

    const isNameConflict = await Permission.findOne({
      name: newGeneratedName,
      _id: { $ne: permissionId },
    });
    if (isNameConflict) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        `Another permission with the name '${newGeneratedName}' already exists!`,
      );
    }
  }

  const result = await Permission.findByIdAndUpdate(
    permissionId,
    { $set: payload },
    { new: true, runValidators: true },
  );

  return result;
};

const assignPermissionsToUser = async (payload: {
  userCustomId: string;
  permissionIds: string[];
}) => {
  const { userCustomId, permissionIds } = payload;

  const isUserExist = await AuthUser.findOne({
    userCustomId,
    isDeleted: false,
  });
  if (!isUserExist) {
    throw new AppError(httpStatus.NOT_FOUND, 'Target user not found!');
  }

  const validPermissions = await Permission.find({
    _id: { $in: permissionIds },
  });
  if (validPermissions.length !== permissionIds.length) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'One or more Permission IDs are invalid!',
    );
  }

  const updatedUser = await AuthUser.findOneAndUpdate(
    { userCustomId },
    { $addToSet: { permissions: { $each: permissionIds } } },
    { new: true, runValidators: true },
  ).populate('permissions');

  return updatedUser;
};

const revokePermissionsFromUser = async (payload: {
  userCustomId: string;
  permissionIds: string[];
}) => {
  const { userCustomId, permissionIds } = payload;

  const isUserExist = await AuthUser.findOne({
    userCustomId,
    isDeleted: false,
  });
  if (!isUserExist) {
    throw new AppError(httpStatus.NOT_FOUND, 'Target user not found!');
  }

  const updatedUser = await AuthUser.findOneAndUpdate(
    { userCustomId },
    { $pull: { permissions: { $in: permissionIds } } },
    { new: true, runValidators: true },
  ).populate('permissions');

  return updatedUser;
};

export const PermissionServices = {
  seedInitialPermissions,
  createPermission,
  updatePermission,
  assignPermissionsToUser,
  revokePermissionsFromUser,
};
