/* eslint-disable @typescript-eslint/no-explicit-any */
import httpStatus from 'http-status';
import AppError from '../errors/AppError';
import { AuthUser } from '../modules/AuthUser/authUser.model';

export const findUserById = async ({
  userCustomId,
}: {
  userCustomId: string;
  isDeleted?: boolean;
}) => {
  if (!userCustomId) {
    throw new AppError(httpStatus.BAD_REQUEST, 'User ID must be provided');
  }

  const user = await AuthUser.findOne({ userCustomId });
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }
  if (user.isDeleted) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      'Your account is deleted. Please contact support.',
    );
  }
};
export const findUserByEmail = async ({ email }: { email: string }) => {
  if (!email) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Email must be provided');
  }

  const user = await AuthUser.findOne({ email });
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }
  if (user.isDeleted) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      'Your account is deleted. Please contact support.',
    );
  }
};
