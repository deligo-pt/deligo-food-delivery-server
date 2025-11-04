import { QueryBuilder } from '../../builder/QueryBuilder';
import AppError from '../../errors/AppError';
import httpStatus from 'http-status';
import { AuthUser } from '../../constant/user.const';
import { TDeliveryPartner } from './delivery-partner.interface';
import { DeliveryPartner } from './delivery-partner.model';
import { DeliveryPartnerSearchableFields } from './delivery-partner.constant';

const updateDeliveryPartner = async (
  payload: Partial<TDeliveryPartner>,
  deliveryPartnerId: string,
  user: AuthUser
) => {
  const existingDeliveryPartner = await DeliveryPartner.findOne({
    deliveryPartnerId,
  });
  if (!existingDeliveryPartner) {
    throw new AppError(httpStatus.NOT_FOUND, 'Delivery Partner not found!');
  }
  if (!existingDeliveryPartner?.isEmailVerified) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Please verify your email');
  }
  if (user?.id !== existingDeliveryPartner?.deliveryPartnerId) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'You are not authorized for update'
    );
  }
  const updateDeliveryPartner = await DeliveryPartner.findOneAndUpdate(
    { deliveryPartnerId },
    payload,
    {
      new: true,
    }
  );
  return updateDeliveryPartner;
};

//get all delivery partners
const getAllDeliveryPartnersFromDB = async (query: Record<string, unknown>) => {
  const deliveryPartners = new QueryBuilder(DeliveryPartner.find(), query)
    .fields()
    .paginate()
    .sort()
    .filter()
    .search(DeliveryPartnerSearchableFields);

  const result = await deliveryPartners.modelQuery;

  return result;
};

// get single delivery partner
const getSingleDeliveryPartnerFromDB = async (deliveryPartnerId: string) => {
  const existingDeliveryPartner = await DeliveryPartner.findOne({
    deliveryPartnerId,
  });
  if (!existingDeliveryPartner) {
    throw new AppError(httpStatus.NOT_FOUND, 'Delivery Partner not found!');
  }

  return existingDeliveryPartner;
};

export const DeliveryPartnerServices = {
  updateDeliveryPartner,
  getAllDeliveryPartnersFromDB,
  getSingleDeliveryPartnerFromDB,
};
