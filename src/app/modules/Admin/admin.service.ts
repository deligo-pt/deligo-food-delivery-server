import AppError from '../../errors/AppError';
import httpStatus from 'http-status';
import { TAdmin } from './admin.interface';
import { Admin, TAdminImageDocuments } from './admin.model';
import { QueryBuilder } from '../../builder/QueryBuilder';
import { AdminSearchableFields } from './admin.constant';
import { deleteSingleImageFromCloudinary } from '../../utils/deleteImage';
import { TAuthUser } from '../AuthUser/authUser.interface';
import { AuthUser } from '../AuthUser/authUser.model';
import { getPopulateOptions } from '../../utils/getPopulateOptions';
import { USER_ROLE } from '../../constant/GlobalConstant/user.constant';
// update admin service
const updateAdmin = async (
  payload: Partial<TAdmin>,
  adminCustomId: string,
  currentUser: TAuthUser,
) => {
  // -----------------------------------------
  // Check if admin exists
  // -----------------------------------------
  const existingAdmin = await Admin.findOne({ userId: adminCustomId });

  if (!existingAdmin) {
    throw new AppError(httpStatus.NOT_FOUND, 'Admin not found!');
  }

  // -----------------------------------------
  // Update lock check
  // -----------------------------------------
  if (existingAdmin.isUpdateLocked) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Admin update is locked. Please contact support.',
    );
  }

  if (payload.address) {
    const { longitude, latitude, geoAccuracy = 0 } = payload.address;

    if (geoAccuracy !== undefined && geoAccuracy > 100) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'Geo accuracy must be less than or equal to 100.',
      );
    }
    const hasLng = typeof longitude === 'number';
    const hasLat = typeof latitude === 'number';

    if (hasLng && hasLat) {
      payload.currentSessionLocation = {
        type: 'Point',
        coordinates: [longitude, latitude],
        geoAccuracy: geoAccuracy,
        lastLocationUpdate: new Date(),
      };
    }
  }

  // -----------------------------------------
  // Authorization check
  // -----------------------------------------
  if (
    currentUser.role === 'ADMIN' &&
    currentUser.userId !== existingAdmin.userId
  ) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'You are not authorized to update this admin account.',
    );
  }

  // -----------------------------------------
  // Update admin
  // -----------------------------------------
  const updatedAdmin = await Admin.findOneAndUpdate(
    { userId: adminCustomId },
    { $set: payload },
    { new: true },
  );

  if (!updatedAdmin) {
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Failed to update admin profile.',
    );
  }

  return updatedAdmin;
};

// admin doc image upload service
const adminDocImageUpload = async (
  file: string | undefined,
  data: TAdminImageDocuments,
  currentUser: TAuthUser,
  adminCustomId: string,
) => {
  const existingAdmin = await Admin.findOne({ userId: adminCustomId });

  if (!existingAdmin) {
    throw new AppError(httpStatus.NOT_FOUND, 'Admin not found!');
  }

  if (currentUser.role === 'ADMIN' && existingAdmin.isUpdateLocked) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Admin update is locked. Please contact support.',
    );
  }

  if (currentUser.role === 'ADMIN' && existingAdmin.userId !== adminCustomId) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'You are not authorized to update this admin account.',
    );
  }
  // delete previous image if exists
  const docTitle = data?.docImageTitle;

  if (docTitle && existingAdmin?.documents?.[docTitle]) {
    const oldImage = existingAdmin?.documents?.[docTitle];
    deleteSingleImageFromCloudinary(oldImage).catch((err) => {
      // throw new AppError(httpStatus.BAD_REQUEST, err.message);
      console.error(err);
    });
  }

  if (data.docImageTitle && file) {
    existingAdmin.documents = {
      ...existingAdmin.documents,
      [data.docImageTitle]: file,
    };
    await existingAdmin.save();
  }

  return {
    message: 'Admin document updated successfully.',
    data: existingAdmin,
  };
};

// get all admin service
const getAllAdmins = async (
  query: Record<string, unknown>,
  currentUser: TAuthUser,
) => {
  if (currentUser?.status !== 'APPROVED') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      `You are not approved to view admins. Your account is ${currentUser?.status}`,
    );
  }

  const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(currentUser.role);

  const queryFilter: any = {
    role: { $in: [USER_ROLE.ADMIN, USER_ROLE.SUPER_ADMIN] },
  };

  if (!isAdmin) {
    queryFilter.isDeleted = false;
  }

  const adminQueryBase = AuthUser.find(queryFilter);
  const adminsQueryBuilder = new QueryBuilder(adminQueryBase, query)
    .fields()
    .paginate()
    .sort()
    .filter()
    .search(AdminSearchableFields);

  const populateOptions = getPopulateOptions(currentUser.role, {
    userObjectId: true,
  });

  populateOptions.forEach((option) => {
    adminsQueryBuilder.modelQuery =
      adminsQueryBuilder.modelQuery.populate(option);
  });

  adminsQueryBuilder.modelQuery = adminsQueryBuilder.modelQuery.populate([
    { path: 'approvedBy', select: 'name userId role' },
    { path: 'rejectedBy', select: 'name userId role' },
    { path: 'blockedBy', select: 'name userId role' },
  ]);

  const meta = await adminsQueryBuilder.countTotal();
  const rawData = await adminsQueryBuilder.modelQuery;

  const formattedData = rawData
    .map((authDoc: any) => {
      const auth = authDoc.toObject ? authDoc.toObject() : authDoc;
      const adminProfile = auth.userObjectId as TAdmin;

      if (!adminProfile) return null;

      const profile = (adminProfile as any).toObject
        ? (adminProfile as any).toObject()
        : adminProfile;

      return {
        _id: profile._id,
        authUserId: auth._id,
        userId: auth.userId,
        email: auth.email || '',
        role: auth.role || 'ADMIN',
        status: auth.status || 'PENDING',
        isDeleted: auth.isDeleted || false,
        isEmailVerified: auth.isEmailVerified || false,
        contactNumber: auth.contactNumber || '',
        loginDevices: auth.loginDevices || [],

        approvedBy: auth.approvedBy || null,
        rejectedBy: auth.rejectedBy || null,
        blockedBy: auth.blockedBy || null,
        remarks: auth.remarks || '',

        ...profile,
      };
    })
    .filter((item) => item !== null);

  return {
    meta,
    data: formattedData,
  };
};

// get single admin service
const getSingleAdmin = async (
  adminCustomId: string,
  currentUser: TAuthUser,
) => {
  if (currentUser.role === 'ADMIN' && currentUser.userId !== adminCustomId) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'You are not authorized to access this admin profile.',
    );
  }

  const authDoc = await AuthUser.findOne({
    userId: adminCustomId,
    role: { $in: ['ADMIN', 'SUPER_ADMIN'] },
  }).populate([
    { path: 'userObjectId' },
    { path: 'approvedBy', select: 'name userId role' },
    { path: 'rejectedBy', select: 'name userId role' },
    { path: 'blockedBy', select: 'name userId role' },
  ]);

  if (!authDoc) {
    throw new AppError(httpStatus.NOT_FOUND, 'Admin account not found!');
  }

  const auth = authDoc.toObject ? authDoc.toObject() : authDoc;
  const adminProfile = auth.userObjectId as any;

  if (!adminProfile || adminProfile.isDeleted) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      'Admin profile metadata not found or has been soft-deleted!',
    );
  }

  const profile = (adminProfile as any).toObject
    ? (adminProfile as any).toObject()
    : adminProfile;

  return {
    _id: profile._id,
    authUserId: auth._id,
    userId: auth.userId,
    email: auth.email || '',
    role: auth.role || 'ADMIN',
    status: auth.status || 'PENDING',
    isDeleted: auth.isDeleted || false,
    isEmailVerified: auth.isEmailVerified || false,
    contactNumber: auth.contactNumber || '',
    loginDevices: auth.loginDevices || [],

    approvedBy: auth.approvedBy || null,
    rejectedBy: auth.rejectedBy || null,
    blockedBy: auth.blockedBy || null,
    remarks: auth.remarks || '',

    ...profile,
  };
};

export const AdminServices = {
  updateAdmin,
  adminDocImageUpload,
  getAllAdmins,
  getSingleAdmin,
};
