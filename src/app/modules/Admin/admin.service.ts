import AppError from '../../errors/AppError';
import httpStatus from 'http-status';
import { AuthUser } from '../../constant/user.constant';
import { TAdmin } from './admin.interface';
import { Admin } from './admin.model';
import { QueryBuilder } from '../../builder/QueryBuilder';
import { AdminSearchableFields } from './admin.constant';
import { findUserByEmailOrId } from '../../utils/findUserByEmailOrId';
// update admin service
const updateAdmin = async (
  payload: Partial<TAdmin>,
  adminId: string,
  currentUser: AuthUser
) => {
  // -----------------------------------------
  // Check if admin exists
  // -----------------------------------------
  const existingAdmin = await Admin.findOne({ userId: adminId });

  if (!existingAdmin) {
    throw new AppError(httpStatus.NOT_FOUND, 'Admin not found!');
  }

  // -----------------------------------------
  // Email verification check
  // -----------------------------------------
  if (!existingAdmin.isEmailVerified) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Please verify your email.');
  }

  // -----------------------------------------
  // Update lock check
  // -----------------------------------------
  if (existingAdmin.isUpdateLocked) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Admin update is locked. Please contact support.'
    );
  }

  // -----------------------------------------
  // Authorization check
  // -----------------------------------------
  if (currentUser.id !== existingAdmin.userId) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'You are not authorized to update this admin account.'
    );
  }

  // -----------------------------------------
  // Update admin
  // -----------------------------------------
  const updatedAdmin = await Admin.findOneAndUpdate(
    { userId: adminId },
    { $set: payload },
    { new: true }
  );

  if (!updatedAdmin) {
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Failed to update admin profile.'
    );
  }

  return updatedAdmin;
};

// get all admin service
const getAllAdmins = async (query: Record<string, unknown>) => {
  const admins = new QueryBuilder(Admin.find(), query)
    .filter()
    .sort()
    .fields()
    .paginate()
    .search(AdminSearchableFields);

  const meta = await admins.countTotal();
  const data = await admins.modelQuery;

  return {
    meta,
    data,
  };
};

// get single admin service
const getSingleAdmin = async (adminId: string, currentUser: AuthUser) => {
  // ---------------------------------------------------------
  // Validate CURRENT user (logged-in admin)
  // ---------------------------------------------------------
  const result = await findUserByEmailOrId({
    userId: currentUser.id,
    isDeleted: false,
  });

  const loggedInUser = result?.user;

  if (!loggedInUser) {
    throw new AppError(httpStatus.UNAUTHORIZED, 'User not found!');
  }

  // ---------------------------------------------------------
  // Authorization Logic
  // ---------------------------------------------------------
  if (loggedInUser.role === 'ADMIN' && loggedInUser.userId !== adminId) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'You are not authorized to access this admin.'
    );
  }

  // ---------------------------------------------------------
  // Fetch the TARGET admin by passed adminId
  // ---------------------------------------------------------
  const existingAdmin = await Admin.findOne({ userId: adminId });

  if (!existingAdmin) {
    throw new AppError(httpStatus.NOT_FOUND, 'Admin not found!');
  }

  return existingAdmin;
};

export const AdminServices = {
  updateAdmin,
  getAllAdmins,
  getSingleAdmin,
};
