import httpStatus from 'http-status';
import AppError from '../../errors/AppError';
import { AuthUser } from '../AuthUser/authUser.model';
import { Permission } from './permission.model';

const seedInitialPermissionsIntoDB = async () => {
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

export const PermissionServices = {
  seedInitialPermissionsIntoDB,
  assignPermissionsToUser,
};
