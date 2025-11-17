import { QueryBuilder } from '../../builder/QueryBuilder';
import AppError from '../../errors/AppError';
import httpStatus from 'http-status';
import { AuthUser } from '../../constant/user.const';
import {
  TDeliveryPartner,
  TDeliveryPartnerImageDocuments,
} from './delivery-partner.interface';
import { DeliveryPartner } from './delivery-partner.model';
import { DeliveryPartnerSearchableFields } from './delivery-partner.constant';
import { findUserByEmailOrId } from '../../utils/findUserByEmailOrId';
import { deleteSingleImageFromCloudinary } from '../../utils/deleteImage';

const updateDeliveryPartner = async (
  payload: Partial<TDeliveryPartner>,
  deliveryPartnerId: string,
  currentUser: AuthUser,
  profilePhoto?: string
) => {
  await findUserByEmailOrId({
    userId: currentUser?.id,
    isDeleted: false,
  });

  const existingDeliveryPartner = await DeliveryPartner.findOne({
    userId: deliveryPartnerId,
  });
  if (!existingDeliveryPartner) {
    throw new AppError(httpStatus.NOT_FOUND, 'Delivery Partner not found!');
  }
  if (currentUser?.role === 'DELIVERY_PARTNER') {
    if (existingDeliveryPartner?.userId !== currentUser?.id) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        'You are not authorized for update'
      );
    }

    if (!existingDeliveryPartner?.isEmailVerified) {
      throw new AppError(httpStatus.BAD_REQUEST, 'Please verify your email');
    }
  }
  if (currentUser?.id !== existingDeliveryPartner?.registeredBy) {
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

  const updateDeliveryPartner = await DeliveryPartner.findOneAndUpdate(
    { userId: deliveryPartnerId },
    payload,
    {
      new: true,
    }
  );
  return updateDeliveryPartner;
};

// update doc image
const deliverPartnerDocImageUpload = async (
  file: string | undefined,
  data: TDeliveryPartnerImageDocuments,
  currentUser: AuthUser,
  deliveryPartnerId: string
) => {
  const existingDeliveryPartner = await DeliveryPartner.findOne({
    userId: deliveryPartnerId,
  });
  if (!existingDeliveryPartner) {
    throw new AppError(httpStatus.NOT_FOUND, 'Fleet Manager not found');
  }

  if (currentUser?.role === 'DELIVERY_PARTNER') {
    if (currentUser?.id !== existingDeliveryPartner?.userId) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'You are not authorize to upload document image!'
      );
    }
  }

  // delete previous image if exists
  const docTitle = data?.docImageTitle;

  if (docTitle && existingDeliveryPartner?.documents?.[docTitle]) {
    const oldImage = existingDeliveryPartner?.documents?.[docTitle];
    deleteSingleImageFromCloudinary(oldImage).catch((err) => {
      throw new AppError(httpStatus.BAD_REQUEST, err.message);
    });
  }

  if (data.docImageTitle && file) {
    existingDeliveryPartner.documents = {
      ...existingDeliveryPartner.documents,
      [data.docImageTitle]: file,
    };
    await existingDeliveryPartner.save();
  }

  return {
    message: 'Delivery Partner document image updated successfully',
    existingDeliveryPartner: existingDeliveryPartner,
  };
};

//get all delivery partners
const getAllDeliveryPartnersFromDB = async (
  query: Record<string, unknown>,
  currentUser: AuthUser
) => {
  if (currentUser?.role === 'FLEET_MANAGER') {
    query.registeredBy = currentUser?.id;
  }

  const deliveryPartners = new QueryBuilder(DeliveryPartner.find(), query)
    .fields()
    .paginate()
    .sort()
    .filter()
    .search(DeliveryPartnerSearchableFields);

  const meta = await deliveryPartners.countTotal();

  const data = await deliveryPartners.modelQuery;

  return {
    meta,
    data,
  };
};

// get single delivery partner
const getSingleDeliveryPartnerFromDB = async (
  deliveryPartnerId: string,
  currentUser: AuthUser
) => {
  if (
    currentUser?.role === 'DELIVERY_PARTNER' &&
    currentUser?.id !== deliveryPartnerId
  ) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'You are not authorized to access this delivery partner'
    );
  }

  const existingDeliveryPartner = await DeliveryPartner.findOne({
    userId: deliveryPartnerId,
  });
  if (!existingDeliveryPartner) {
    throw new AppError(httpStatus.NOT_FOUND, 'Delivery Partner not found!');
  }

  if (
    currentUser?.role === 'FLEET_MANAGER' &&
    existingDeliveryPartner?.registeredBy !== currentUser?.id
  ) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'You are not authorized to access this delivery partner'
    );
  }

  return existingDeliveryPartner;
};

export const DeliveryPartnerServices = {
  updateDeliveryPartner,
  deliverPartnerDocImageUpload,
  getAllDeliveryPartnersFromDB,
  getSingleDeliveryPartnerFromDB,
};
