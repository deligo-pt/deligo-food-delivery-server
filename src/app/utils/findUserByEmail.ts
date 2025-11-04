import { ALL_USER_MODELS } from '../modules/Auth/auth.constant';

export const findUserByEmail = async (email: string) => {
  for (const Model of ALL_USER_MODELS) {
    const foundUser = await Model.isUserExistsByEmail(email);
    if (foundUser) {
      return { user: foundUser, model: Model };
    }
  }
  return null;
};
