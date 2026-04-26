/* eslint-disable @typescript-eslint/no-explicit-any */
import mongoose from 'mongoose';
import { ROLE_COLLECTION_MAP } from '../constant/user.constant';
import { USER_ROLE } from '../constant/user.constant';
import customNanoId from './customNanoId';

export const generateReferralCode = async (
  firstName: string,
): Promise<string> => {
  const cleanName = firstName.replace(/\s/g, '').toUpperCase();
  const namePart =
    cleanName.length >= 4
      ? cleanName.substring(0, 4)
      : cleanName.padEnd(4, 'X');

  const randomPart = customNanoId(4).toUpperCase();
  const referralCode = `${namePart}${randomPart}`;

  const requiredRoles = [
    USER_ROLE.CUSTOMER,
    USER_ROLE.VENDOR,
    USER_ROLE.DELIVERY_PARTNER,
  ];

  const targetModelNames = requiredRoles
    .map(
      (role) => ROLE_COLLECTION_MAP[role as keyof typeof ROLE_COLLECTION_MAP],
    )
    .filter((modelName) => !!modelName);

  const existenceChecks = targetModelNames.map(async (modelName) => {
    const model = mongoose.models[modelName] || mongoose.model(modelName);
    return await (model as any).findOne({ referralCode }).select('_id').lean();
  });

  const results = await Promise.all(existenceChecks);
  const isExist = results.some((result) => result !== null);

  if (isExist) {
    return generateReferralCode(firstName);
  }

  return referralCode;
};
