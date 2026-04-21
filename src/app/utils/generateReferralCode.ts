import { Customer } from '../modules/Customer/customer.model';
import customNanoId from './customNanoId';

export const generateReferralCode = async (
  firstName: string,
): Promise<string> => {
  const namePart = firstName.substring(0, 4).toUpperCase().replace(/\s/g, '');
  const randomPart = customNanoId(4).toUpperCase();
  const referralCode = `${namePart}${randomPart}`;

  const isExist = await Customer.findOne({ referralCode });

  if (isExist) {
    return generateReferralCode(firstName);
  }

  return referralCode;
};
