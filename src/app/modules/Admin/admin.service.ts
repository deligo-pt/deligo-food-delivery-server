import AppError from '../../errors/AppError';
import httpStatus from 'http-status';
import { AuthUser } from '../../constant/user.const';
import { TAdmin } from './admin.interface';
import { Admin } from './admin.model';

const updateAdmin = async (
  payload: Partial<TAdmin>,
  adminId: string,
  user: AuthUser
) => {
  const existingAdmin = await Admin.findOne({ adminId });
  if (!existingAdmin) {
    throw new AppError(httpStatus.NOT_FOUND, 'Admin not found!');
  }
  if (!existingAdmin?.isEmailVerified) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Please verify your email');
  }
  if (user?.id !== existingAdmin?.adminId) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'You are not authorized for update'
    );
  }
  const updateAdmin = await Admin.findOneAndUpdate({ adminId }, payload, {
    new: true,
  });
  return updateAdmin;
};

export const AdminServices = {
  updateAdmin,
};
