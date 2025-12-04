import { QueryBuilder } from '../../builder/QueryBuilder';
import AppError from '../../errors/AppError';
import httpStatus from 'http-status';
import { AuthUser } from '../../constant/user.constant';
import {
  TDeliveryPartner,
  TDeliveryPartnerImageDocuments,
} from './delivery-partner.interface';
import { DeliveryPartner } from './delivery-partner.model';
import { DeliveryPartnerSearchableFields } from './delivery-partner.constant';
import { findUserByEmailOrId } from '../../utils/findUserByEmailOrId';
import { deleteSingleImageFromCloudinary } from '../../utils/deleteImage';

// update delivery partner profile service
const updateDeliveryPartner = async (
  payload: Partial<TDeliveryPartner>,
  deliveryPartnerId: string,
  currentUser: AuthUser
) => {
  // ---------------------------------------------------------
  // Validate logged-in user (exists & active)
  // ---------------------------------------------------------
  const result = await findUserByEmailOrId({
    userId: currentUser.id,
    isDeleted: false,
  });

  const loggedInUser = result?.user;

  if (!loggedInUser) {
    throw new AppError(httpStatus.UNAUTHORIZED, 'User not found!');
  }

  // ---------------------------------------------------------
  // Check if target delivery partner exists
  // ---------------------------------------------------------
  const existingDeliveryPartner = await DeliveryPartner.findOne({
    userId: deliveryPartnerId,
  });

  if (!existingDeliveryPartner) {
    throw new AppError(httpStatus.NOT_FOUND, 'Delivery Partner not found!');
  }

  // ---------------------------------------------------------
  // Check if update is locked
  // ---------------------------------------------------------
  if (existingDeliveryPartner.isUpdateLocked) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Delivery Partner update is locked. Please contact support.'
    );
  }

  // ---------------------------------------------------------
  // Authorization Logic
  // ---------------------------------------------------------

  // Delivery Partner updating their own profile
  if (loggedInUser.role === 'DELIVERY_PARTNER') {
    if (existingDeliveryPartner.userId !== loggedInUser?.userId) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        'You are not authorized to update this profile.'
      );
    }

    if (!existingDeliveryPartner.isEmailVerified) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'Please verify your email before updating your profile.'
      );
    }
  }

  // Admin/SuperAdmin updating a partner they registered
  if (
    currentUser.role !== 'DELIVERY_PARTNER' &&
    existingDeliveryPartner.registeredBy !== loggedInUser?.userId
  ) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'You are not authorized to update this Delivery Partner.'
    );
  }

  // ---------------------------------------------------------
  // GeoJSON location updates if lat/lng is provided
  // ---------------------------------------------------------
  if (payload.address?.latitude && payload.address?.longitude) {
    payload.location = {
      type: 'Point',
      coordinates: [payload.address.longitude, payload.address.latitude],
    };
  }
  payload.status = 'PENDING';
  // ---------------------------------------------------------
  // Update the delivery partner
  // ---------------------------------------------------------
  const updatedDeliveryPartner = await DeliveryPartner.findOneAndUpdate(
    { userId: deliveryPartnerId },
    { $set: payload },
    { new: true }
  );

  if (!updatedDeliveryPartner) {
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Failed to update Delivery Partner.'
    );
  }

  return updatedDeliveryPartner;
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
  const result = await findUserByEmailOrId({
    userId: currentUser?.id,
    isDeleted: false,
  });
  const user = result?.user;
  if (
    user?.role === 'DELIVERY_PARTNER' &&
    currentUser?.id !== deliveryPartnerId
  ) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'You are not authorized to access this delivery partner'
    );
  }

  let existingDeliveryPartner;

  if (user?.role !== 'ADMIN' && user?.role !== 'SUPER_ADMIN') {
    existingDeliveryPartner = await DeliveryPartner.findOne({
      userId: deliveryPartnerId,
      isDeleted: false,
    });
  } else {
    existingDeliveryPartner = await DeliveryPartner.findOne({
      userId: deliveryPartnerId,
    });
  }

  if (!existingDeliveryPartner) {
    throw new AppError(httpStatus.NOT_FOUND, 'Delivery Partner not found!');
  }

  if (
    user?.role === 'FLEET_MANAGER' &&
    existingDeliveryPartner?.registeredBy !== user?.userId
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
