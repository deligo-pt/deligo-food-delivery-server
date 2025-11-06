import httpStatus from 'http-status';
import AppError from '../errors/AppError';
import { ALL_USER_MODELS } from '../modules/Auth/auth.constant';

export const findUserByEmailOrId = async ({
  userId,
  email,
  isDeleted,
}: {
  userId?: string;
  email?: string;
  isDeleted?: boolean;
}) => {
  if (!email && !userId) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Email or ID must be provided');
  }
  for (const Model of ALL_USER_MODELS) {
    let foundUser = null;
    if (email) {
      if (isDeleted) {
        foundUser = await Model.isUserExistsByEmail(email, isDeleted);
      } else {
        foundUser = await Model.isUserExistsByEmail(email);
      }
    } else if (userId) {
      if (isDeleted) {
        foundUser = await Model.isUserExistsByUserId(userId, isDeleted);
      } else {
        foundUser = await Model.isUserExistsByUserId(userId);
      }
    }
    if (foundUser) {
      return { user: foundUser, model: Model };
    }
  }
  throw new AppError(
    httpStatus.NOT_FOUND,
    email
      ? `No user found with email "${email}".`
      : `No user found with ID "${userId}".`
  );
};
