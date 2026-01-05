import { QueryBuilder } from '../../builder/QueryBuilder';
import AppError from '../../errors/AppError';
import httpStatus from 'http-status';
import { AuthUser } from '../../constant/user.constant';
import {
  TDeliveryPartner,
  TDeliveryPartnerImageDocuments,
  TLiveLocationPayload,
} from './delivery-partner.interface';
import { DeliveryPartner } from './delivery-partner.model';
import { DeliveryPartnerSearchableFields } from './delivery-partner.constant';
import { deleteSingleImageFromCloudinary } from '../../utils/deleteImage';
import { getPopulateOptions } from '../../utils/getPopulateOptions';

// update delivery partner profile service
const updateDeliveryPartner = async (
  payload: Partial<TDeliveryPartner>,
  deliveryPartnerId: string,
  currentUser: AuthUser
) => {
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
  if (
    currentUser.role === 'FLEET_MANAGER' &&
    existingDeliveryPartner.isUpdateLocked
  ) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Delivery Partner update is locked. Please contact support.'
    );
  }

  // ---------------------------------------------------------
  // Authorization Logic
  // ---------------------------------------------------------

  // Delivery Partner updating their own profile
  if (currentUser.role === 'DELIVERY_PARTNER') {
    if (existingDeliveryPartner.userId !== currentUser?.userId) {
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
    currentUser.role === 'FLEET_MANAGER' &&
    existingDeliveryPartner.registeredBy?.toString() !==
      currentUser?._id.toString()
  ) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'You are not authorized to update this Delivery Partner.'
    );
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

// update delivery partner live location
const updateDeliveryPartnerLiveLocation = async (
  payload: TLiveLocationPayload,
  currentUser: AuthUser
) => {
  // ------------------------------------
  // Role check
  // ------------------------------------
  if (currentUser.role !== 'DELIVERY_PARTNER') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'Only delivery partners can update live location'
    );
  }

  const { latitude, longitude, accuracy = 0 } = payload;

  // ------------------------------------
  // Basic GPS validation
  // ------------------------------------
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Invalid GPS coordinates');
  }

  if (accuracy > 100) {
    // Ignore bad GPS (fake / weak signal)
    return { skipped: true, reason: 'Low GPS accuracy' };
  }

  // ------------------------------------
  // Update only location fields
  // ------------------------------------
  const updated = await DeliveryPartner.findOneAndUpdate(
    { userId: currentUser.userId, isDeleted: false },
    {
      $set: {
        currentSessionLocation: {
          type: 'Point',
          coordinates: [longitude, latitude],
          accuracy,
          lastLocationUpdate: new Date(),
        },
        'operationalData.lastActivityAt': new Date(),
      },
    },
    { new: true, projection: { currentSessionLocation: 1 } }
  );

  if (!updated) {
    throw new AppError(httpStatus.NOT_FOUND, 'Delivery Partner not found');
  }

  return {
    message: 'Live location updated',
    location: updated.currentSessionLocation,
  };
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

  if (currentUser?.role === 'FLEET_MANAGER') {
    if (
      currentUser?._id.toString() !==
      existingDeliveryPartner?.registeredBy?.toString()
    ) {
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
    query.registeredBy = currentUser?._id.toString();
  }

  const deliveryPartners = new QueryBuilder(DeliveryPartner.find(), query)
    .fields()
    .paginate()
    .sort()
    .filter()
    .search(DeliveryPartnerSearchableFields);

  const populateOptions = getPopulateOptions(currentUser.role, {
    approvedBy: 'name userId role',
    rejectedBy: 'name userId role',
    blockedBy: 'name userId role',
  });
  populateOptions.forEach((option) => {
    deliveryPartners.modelQuery = deliveryPartners.modelQuery.populate(option);
  });

  const meta = await deliveryPartners.countTotal();

  const data = await deliveryPartners.modelQuery;

  return {
    meta,
    data,
  };
};

// get single delivery partner from db
const getSingleDeliveryPartnerFromDB = async (
  deliveryPartnerId: string,
  currentUser: AuthUser
) => {
  if (
    currentUser?.role === 'DELIVERY_PARTNER' &&
    currentUser?.userId !== deliveryPartnerId
  ) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'You are not authorized to access this delivery partner'
    );
  }

  let existingDeliveryPartner;

  if (currentUser?.role !== 'ADMIN' && currentUser?.role !== 'SUPER_ADMIN') {
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
    currentUser?.role === 'FLEET_MANAGER' &&
    existingDeliveryPartner?.registeredBy?.toString() !==
      currentUser?._id.toString()
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
  updateDeliveryPartnerLiveLocation,
  deliverPartnerDocImageUpload,
  getAllDeliveryPartnersFromDB,
  getSingleDeliveryPartnerFromDB,
};
