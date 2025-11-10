import AppError from '../../errors/AppError';
import httpStatus from 'http-status';
import { AuthUser } from '../../constant/user.const';
import { TAdmin } from './admin.interface';
import { Admin } from './admin.model';
import { QueryBuilder } from '../../builder/QueryBuilder';
import { AdminSearchableFields } from './admin.constant';
// update admin service
const updateAdmin = async (
  payload: Partial<TAdmin>,
  adminId: string,
  currentUser: AuthUser,
  profilePhoto: string | undefined
) => {
  const existingAdmin = await Admin.findOne({ userId: adminId });
  if (!existingAdmin) {
    throw new AppError(httpStatus.NOT_FOUND, 'Admin not found!');
  }
  if (!existingAdmin?.isEmailVerified) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Please verify your email');
  }
  if (currentUser?.id !== existingAdmin?.userId) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'You are not authorized for update'
    );
  }

  if (payload.profilePhoto) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Profile photo should be in file!'
    );
  }
  if (profilePhoto) {
    payload.profilePhoto = profilePhoto;
  }

  const updateAdmin = await Admin.findOneAndUpdate(
    { userId: adminId },
    { ...payload },
    {
      new: true,
    }
  );
  return updateAdmin;
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

export const AdminServices = {
  updateAdmin,
  getAllAdmins,
};
