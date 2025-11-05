import httpStatus from 'http-status';
import AppError from '../errors/AppError';
import { ALL_USER_MODELS } from '../modules/Auth/auth.constant';

export const findUserByEmailOrId = async ({
  id,
  email,
}: {
  id?: string;
  email?: string;
}) => {
  if (!email && !id) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Email or ID must be provided');
  }

  for (const Model of ALL_USER_MODELS) {
    let foundUser = null;
    if (email) {
      foundUser = await Model.isUserExistsByEmail(email);
    } else if (id) {
      foundUser = await Model.findOne({ userId: id });
    }
    if (foundUser) {
      return { user: foundUser, model: Model };
    }
  }
  return null;
};
