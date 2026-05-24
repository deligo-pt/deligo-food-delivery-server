import httpStatus from 'http-status';
import AppError from '../../errors/AppError';
import { AuthUser } from '../AuthUser/authUser.model';
import { Permission } from './permission.model';
import { TPermission } from './permission.interface';

const seedInitialPermissions = async () => {
  const initialPermissions = [
    // =====================================================================
    // Delivery Partner (Rider) Management Module
    // =====================================================================
    {
      name: 'VIEW_DELIVERY_PARTNERS',
      subject: 'DELIVERY_PARTNER',
      action: 'READ',
      description:
        'Allows reading and viewing the list of all delivery partners/riders.',
    },
    {
      name: 'CREATE_DELIVERY_PARTNER',
      subject: 'DELIVERY_PARTNER',
      action: 'CREATE',
      description:
        'Allows onboarding or creating a new delivery partner profile.',
    },
    {
      name: 'UPDATE_DELIVERY_PARTNER',
      subject: 'DELIVERY_PARTNER',
      action: 'UPDATE',
      description:
        'Allows updating profile details, vehicles, and settings of a delivery partner.',
    },
    {
      name: 'DELETE_DELIVERY_PARTNER',
      subject: 'DELIVERY_PARTNER',
      action: 'DELETE',
      description:
        'Allows soft-deleting or deactivating a delivery partner account.',
    },
    {
      name: 'MANAGE_DELIVERY_PARTNER',
      subject: 'DELIVERY_PARTNER',
      action: 'MANAGE',
      description:
        'Full master control over the delivery partner module operations.',
    },

    // =====================================================================
    // Vendor & Store Management Module
    // =====================================================================
    {
      name: 'VIEW_VENDORS',
      subject: 'VENDOR',
      action: 'READ',
      description:
        'Allows listing and viewing registered food/e-commerce vendors.',
    },
    {
      name: 'CREATE_VENDOR',
      subject: 'VENDOR',
      action: 'CREATE',
      description: 'Allows registering and onboarding a new vendor store.',
    },
    {
      name: 'UPDATE_VENDOR',
      subject: 'VENDOR',
      action: 'UPDATE',
      description:
        'Allows changing vendor configurations, schedules, or commissions.',
    },
    {
      name: 'DELETE_VENDOR',
      subject: 'VENDOR',
      action: 'DELETE',
      description:
        'Allows suspension or removal of a vendor store from the system.',
    },
    {
      name: 'MANAGE_VENDOR',
      subject: 'VENDOR',
      action: 'MANAGE',
      description:
        'Full controller access to manage overall food/e-commerce vendors.',
    },

    // =====================================================================
    // Order & Logistics Module
    // =====================================================================
    {
      name: 'VIEW_ORDERS',
      subject: 'ORDER',
      action: 'READ',
      description:
        'Allows dispatchers and support staff to view and track live orders.',
    },
    {
      name: 'CREATE_ORDER',
      subject: 'ORDER',
      action: 'CREATE',
      description: 'Allows placing backend counter or backup logistics orders.',
    },
    {
      name: 'UPDATE_ORDER',
      subject: 'ORDER',
      action: 'UPDATE',
      description:
        'Allows dispatching, re-routing, or manually changing order milestones.',
    },
    {
      name: 'DELETE_ORDER',
      subject: 'ORDER',
      action: 'DELETE',
      description:
        'Allows cancellation or pruning of invalid/fraudulent orders.',
    },
    {
      name: 'MANAGE_ORDER',
      subject: 'ORDER',
      action: 'MANAGE',
      description:
        'Allows full administrative override power across platform logistics.',
    },

    // =====================================================================
    // Coupon Module
    // =====================================================================
    {
      name: 'VIEW_COUPONS',
      subject: 'COUPON',
      action: 'READ',
      description:
        'Allows tracking active discount coupon marketing campaigns.',
    },
    {
      name: 'CREATE_COUPON',
      subject: 'COUPON',
      action: 'CREATE',
      description:
        'Allows creating new promo codes or customer reward coupons.',
    },
    {
      name: 'UPDATE_COUPON',
      subject: 'COUPON',
      action: 'UPDATE',
      description:
        'Allows modifying coupon expiration caps or maximum usage targets.',
    },
    {
      name: 'DELETE_COUPON',
      subject: 'COUPON',
      action: 'DELETE',
      description: 'Allows disabling or expiring an active coupon promotion.',
    },
    {
      name: 'MANAGE_COUPON',
      subject: 'COUPON',
      action: 'MANAGE',
      description:
        'Allows creating, updating, and managing marketing discount coupons.',
    },

    // =====================================================================
    // Permission Management Module
    // =====================================================================
    {
      name: 'VIEW_PERMISSIONS',
      subject: 'PERMISSION',
      action: 'READ',
      description:
        'Allows viewing predefined system permission keys and policies.',
    },
    {
      name: 'CREATE_PERMISSION',
      subject: 'PERMISSION',
      action: 'CREATE',
      description: 'Allows creating new security clearance levels.',
    },
    {
      name: 'UPDATE_PERMISSION',
      subject: 'PERMISSION',
      action: 'UPDATE',
      description:
        'Allows updating permission rules or internal technical payloads.',
    },
    {
      name: 'DELETE_PERMISSION',
      subject: 'PERMISSION',
      action: 'DELETE',
      description: 'Allows removing non-used or obsolete permission targets.',
    },
    {
      name: 'MANAGE_PERMISSION',
      subject: 'PERMISSION',
      action: 'MANAGE',
      description:
        'Allows master control over creating, changing, and binding permissions.',
    },

    // =====================================================================
    // Chat Support System Module
    // =====================================================================
    {
      name: 'VIEW_CHAT_SYSTEMS',
      subject: 'CHAT_SYSTEM',
      action: 'READ',
      description:
        'Allows staff to view active support chats and messaging queues.',
    },
    {
      name: 'CREATE_CHAT_SYSTEM',
      subject: 'CHAT_SYSTEM',
      action: 'CREATE',
      description:
        'Allows admin to start a new chat conversion or official announcement.',
    },
    {
      name: 'UPDATE_CHAT_SYSTEM',
      subject: 'CHAT_SYSTEM',
      action: 'UPDATE',
      description:
        'Allows supervisors to re-assign active chats or change status to closed.',
    },
    {
      name: 'DELETE_CHAT_SYSTEM',
      subject: 'CHAT_SYSTEM',
      action: 'DELETE',
      description:
        'Allows permanent archiving or deleting of compliance chat logs.',
    },
    {
      name: 'MANAGE_CHAT_SYSTEM',
      subject: 'CHAT_SYSTEM',
      action: 'MANAGE',
      description:
        'Full privilege access to override chat systems, tickets, and configurations.',
    },

    // =====================================================================
    // Legal Agreement Module
    // =====================================================================
    {
      name: 'VIEW_AGREEMENTS',
      subject: 'AGREEMENT',
      action: 'READ',
      description:
        'Allows compliance managers to view signed restaurant contract agreements.',
    },
    {
      name: 'CREATE_AGREEMENT',
      subject: 'AGREEMENT',
      action: 'CREATE',
      description:
        'Allows admins to upload new dynamic commission rate contract files.',
    },
    {
      name: 'UPDATE_AGREEMENT',
      subject: 'AGREEMENT',
      action: 'UPDATE',
      description:
        'Allows changing agreement terms, renewal cycles, or signature states.',
    },
    {
      name: 'DELETE_AGREEMENT',
      subject: 'AGREEMENT',
      action: 'DELETE',
      description:
        'Allows removal of temporary or voided contract agreement documents.',
    },
    {
      name: 'MANAGE_AGREEMENT',
      subject: 'AGREEMENT',
      action: 'MANAGE',
      description:
        'Full control over platform legal terms, contracts, and vendor agreements.',
    },

    // =====================================================================
    // Customer & Staff Management Tiers
    // =====================================================================
    {
      name: 'VIEW_CUSTOMERS',
      subject: 'CUSTOMER',
      action: 'READ',
      description: 'Allows support staff to search and view user profiles.',
    },
    {
      name: 'UPDATE_CUSTOMER',
      subject: 'CUSTOMER',
      action: 'UPDATE',
      description:
        'Allows blocking, unblocking, or updating wallet balances of a customer.',
    },
    {
      name: 'VIEW_ADMINS',
      subject: 'ADMIN',
      action: 'READ',
      description:
        'Allows viewing internal office staff, system operators, and managers logs.',
    },
    {
      name: 'UPDATE_ADMIN',
      subject: 'ADMIN',
      action: 'UPDATE',
      description:
        'Allows modifying office staff profile information or operations roster.',
    },
  ];

  const seededPermissions = [];

  for (const perm of initialPermissions) {
    // Ensuring case-insensitive matching for ultimate safety during seeding
    const isExist = await Permission.findOne({ name: perm.name.toUpperCase() });
    if (!isExist) {
      const newPerm = await Permission.create(perm);
      seededPermissions.push(newPerm);
    }
  }

  return {
    message: seededPermissions.length
      ? `${seededPermissions.length} new system permissions seeded successfully!`
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
    const upperSubject = subject.toUpperCase();
    generatedName = upperSubject.endsWith('S')
      ? `VIEW_${upperSubject}`
      : `VIEW_${upperSubject}S`;
  } else {
    generatedName = `${action.toUpperCase()}_${subject.toUpperCase()}`;
  }

  payload.name = generatedName;
  payload.subject = subject.toUpperCase();

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
    const finalAction = (payload.action || isExist.action).toUpperCase();
    const finalSubject = (payload.subject || isExist.subject).toUpperCase();

    let newGeneratedName = '';
    if (finalAction === 'READ') {
      newGeneratedName = finalSubject.endsWith('S')
        ? `VIEW_${finalSubject}`
        : `VIEW_${finalSubject}S`;
    } else {
      newGeneratedName = `${finalAction}_${finalSubject}`;
    }

    payload.name = newGeneratedName;
    if (payload.subject) payload.subject = finalSubject;

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
