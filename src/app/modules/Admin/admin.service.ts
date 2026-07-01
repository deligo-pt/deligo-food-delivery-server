/* eslint-disable @typescript-eslint/no-explicit-any */
import AppError from '../../errors/AppError';
import httpStatus from 'http-status';
import { TAdmin } from './admin.interface';
import { Admin, TAdminImageDocuments } from './admin.model';
import { QueryBuilder } from '../../builder/QueryBuilder';
import { AdminSearchableFields } from './admin.constant';
import { deleteSingleImageFromCloudinary } from '../../utils/deleteImage';
import { TCurrentUser } from '../../constant/GlobalInterface/user.interface';
import { AuthUser } from '../AuthUser/authUser.model';
// update admin service
const updateAdmin = async (
  payload: Partial<TAdmin>,
  adminId: string,
  currentUser: TCurrentUser,
) => {
  // -----------------------------------------
  // Check if admin exists
  // -----------------------------------------
  const existingAdmin = await AuthUser.findOne({ userId: adminId }).populate(
    'profileId',
    'isUpdateLocked',
  );

  if (!existingAdmin) {
    throw new AppError(httpStatus.NOT_FOUND, 'ADMIN_NOT_FOUND');
  }

  const adminProfile = existingAdmin?.profileId as any;

  // -----------------------------------------
  // Email verification check
  // -----------------------------------------
  if (!existingAdmin.isEmailVerified) {
    throw new AppError(httpStatus.BAD_REQUEST, 'EMAIL_UNVERIFIED');
  }

  // -----------------------------------------
  // Update lock check
  // -----------------------------------------
  if (adminProfile.isUpdateLocked) {
    throw new AppError(httpStatus.BAD_REQUEST, 'UPDATE_LOCKED');
  }

  if (payload.address) {
    const { longitude, latitude, geoAccuracy = 0 } = payload.address;

    if (geoAccuracy !== undefined && geoAccuracy > 100) {
      throw new AppError(httpStatus.BAD_REQUEST, 'INVALID_GEO_ACCURACY');
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
    throw new AppError(httpStatus.FORBIDDEN, 'UPDATE_UNAUTHORIZED');
  }

  // -----------------------------------------
  // Update admin
  // -----------------------------------------
  const updatedAdmin = await Admin.findOneAndUpdate(
    { userId: adminId },
    { $set: payload },
    { new: true },
  );

  if (!updatedAdmin) {
    throw new AppError(httpStatus.INTERNAL_SERVER_ERROR, 'UPDATE_FAILED');
  }

  return {
    messageKey: 'UPDATE_SUCCESS' as const,
    data: updatedAdmin,
  };
};

// admin doc image upload service
const adminDocImageUpload = async (
  file: string | undefined,
  data: TAdminImageDocuments,
  currentUser: TCurrentUser,
  adminId: string,
) => {
  const existingAdmin = await Admin.findOne({ userId: adminId });

  if (!existingAdmin) {
    throw new AppError(httpStatus.NOT_FOUND, 'ADMIN_NOT_FOUND');
  }

  if (currentUser.role === 'ADMIN' && existingAdmin.isUpdateLocked) {
    throw new AppError(httpStatus.BAD_REQUEST, 'UPDATE_LOCKED');
  }

  if (currentUser.role === 'ADMIN' && existingAdmin.userId !== adminId) {
    throw new AppError(httpStatus.FORBIDDEN, 'UPDATE_UNAUTHORIZED');
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
    if (data.docImageTitle === 'myPhoto') {
      existingAdmin.profilePhoto = file;
    }
    await existingAdmin.save();
  }

  return {
    messageKey: 'DOCUMENT_UPLOAD_SUCCESS' as const,
    data: existingAdmin,
  };
};

// get all admin service
const getAllAdmins = async (query: Record<string, unknown>) => {
  const admins = new QueryBuilder(Admin.find(), query)
    .search(AdminSearchableFields)
    .filter()
    .sort()
    .paginate()
    .fields();
  const meta = await admins.countTotal();
  const data = await admins.modelQuery;

  return {
    messageKey: 'FETCH_ALL_SUCCESS' as const,
    meta,
    data,
  };
};

// get single admin service
const getSingleAdmin = async (adminId: string, currentUser: TCurrentUser) => {
  // ---------------------------------------------------------
  // Authorization Logic
  // ---------------------------------------------------------
  if (currentUser.role === 'ADMIN' && currentUser.userId !== adminId) {
    throw new AppError(httpStatus.FORBIDDEN, 'ACCESS_UNAUTHORIZED');
  }

  // ---------------------------------------------------------
  // Fetch the TARGET admin by passed adminId
  // ---------------------------------------------------------
  const existingAdmin = await Admin.findOne({ userId: adminId });

  if (!existingAdmin) {
    throw new AppError(httpStatus.NOT_FOUND, 'ADMIN_NOT_FOUND');
  }

  return {
    messageKey: 'FETCH_SINGLE_SUCCESS' as const,
    data: existingAdmin,
  };
};

export const AdminServices = {
  updateAdmin,
  adminDocImageUpload,
  getAllAdmins,
  getSingleAdmin,
};
