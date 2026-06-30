/* eslint-disable @typescript-eslint/no-explicit-any */
import { QueryBuilder } from '../../builder/QueryBuilder';
import AppError from '../../errors/AppError';
import httpStatus from 'http-status';
import { TCurrentUser } from '../../constant/GlobalInterface/user.interface';
import {
  TDeliveryPartner,
  TDeliveryPartnerImageDocuments,
} from './delivery-partner.interface';
import { DeliveryPartner } from './delivery-partner.model';
import { DeliveryPartnerSearchableFields } from './delivery-partner.constant';
import { deleteSingleImageFromCloudinary } from '../../utils/deleteImage';
import { getPopulateOptions } from '../../utils/getPopulateOptions';
import { TLiveLocationPayload } from '../../constant/GlobalInterface/location.interface';
import { AuthUser } from '../AuthUser/authUser.model';

// update delivery partner profile service
const updateDeliveryPartner = async (
  payload: Partial<TDeliveryPartner>,
  deliveryPartnerId: string,
  currentUser: TCurrentUser,
) => {
  // ---------------------------------------------------------
  // Check if target delivery partner exists
  // ---------------------------------------------------------
  const existingDeliveryPartner = await AuthUser.findOne({
    userId: deliveryPartnerId,
  }).populate('profileId', 'isUpdateLocked registeredBy');

  if (!existingDeliveryPartner) {
    throw new AppError(httpStatus.NOT_FOUND, 'DELIVERY_PARTNER_NOT_FOUND_BANG');
  }

  const partnerProfile = existingDeliveryPartner.profileId as any;
  if (!partnerProfile) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      'DELIVERY_PARTNER_PROFILE_NOT_FOUND_BANG',
    );
  }

  if (!existingDeliveryPartner.isEmailVerified) {
    throw new AppError(httpStatus.BAD_REQUEST, 'EMAIL_VERIFICATION_REQUIRED');
  }

  // ---------------------------------------------------------
  // Check if update is locked
  // ---------------------------------------------------------
  if (
    (currentUser.role === 'FLEET_MANAGER' ||
      currentUser.role === 'DELIVERY_PARTNER') &&
    partnerProfile.isUpdateLocked
  ) {
    throw new AppError(httpStatus.BAD_REQUEST, 'UPDATE_LOCKED_CONTACT_SUPPORT');
  }

  // ---------------------------------------------------------
  // Authorization Logic
  // ---------------------------------------------------------

  // Delivery Partner updating their own profile
  if (currentUser.role === 'DELIVERY_PARTNER') {
    if (existingDeliveryPartner.userId !== currentUser?.userId) {
      throw new AppError(httpStatus.FORBIDDEN, 'UPDATE_PROFILE_UNAUTHORIZED');
    }
  }

  // Admin/SuperAdmin updating a partner they registered
  if (
    currentUser.role === 'FLEET_MANAGER' &&
    partnerProfile.registeredBy?.id.toString() !== currentUser?._id.toString()
  ) {
    throw new AppError(httpStatus.FORBIDDEN, 'UPDATE_PARTNER_UNAUTHORIZED');
  }

  payload.status = 'PENDING';
  // ---------------------------------------------------------
  // Update the delivery partner
  // ---------------------------------------------------------
  const updatedDeliveryPartner = await DeliveryPartner.findOneAndUpdate(
    { userId: deliveryPartnerId },
    { $set: payload },
    { new: true },
  );

  if (!updatedDeliveryPartner) {
    throw new AppError(httpStatus.INTERNAL_SERVER_ERROR, 'UPDATE_FAILED');
  }

  return {
    messageKey: 'UPDATED_SUCCESS',
    data: updatedDeliveryPartner,
  };
};

// update delivery partner live location
const updateDeliveryPartnerLiveLocation = async (
  payload: TLiveLocationPayload,
  currentUser: TCurrentUser,
  deliveryPartnerId?: string,
) => {
  if (currentUser.role !== 'DELIVERY_PARTNER') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'ONLY_PARTNERS_CAN_UPDATE_LOCATION',
    );
  }

  if (deliveryPartnerId && currentUser.userId !== deliveryPartnerId) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'LIVE_LOCATION_UPDATE_UNAUTHORIZED_BANG',
    );
  }

  const {
    latitude,
    longitude,
    geoAccuracy,
    heading,
    speed,
    isMocked,
    timestamp,
  } = payload;

  if (geoAccuracy !== undefined && geoAccuracy > 100) {
    throw new AppError(httpStatus.BAD_REQUEST, 'GEO_ACCURACY_TOO_HIGH');
  }

  const updateData: Record<string, any> = {
    'currentSessionLocation.type': 'Point',
    'currentSessionLocation.coordinates': [longitude, latitude],
    'currentSessionLocation.lastLocationUpdate': timestamp
      ? new Date(timestamp)
      : new Date(),
    'operationalData.lastActivityAt': new Date(),
  };

  if (geoAccuracy !== undefined)
    updateData['currentSessionLocation.geoAccuracy'] = geoAccuracy;
  if (heading !== undefined)
    updateData['currentSessionLocation.heading'] = heading;
  if (speed !== undefined) updateData['currentSessionLocation.speed'] = speed;

  if (isMocked !== undefined)
    updateData['currentSessionLocation.isMocked'] = isMocked;

  const updated = await DeliveryPartner.findOneAndUpdate(
    { userId: currentUser.userId, isDeleted: false },
    { $set: updateData },
    {
      new: true,
      runValidators: true,
      projection: { currentSessionLocation: 1 },
    },
  );

  if (!updated) {
    throw new AppError(httpStatus.NOT_FOUND, 'DELIVERY_PARTNER_NOT_FOUND');
  }

  return {
    success: true,
    messageKey: 'LIVE_LOCATION_UPDATED_SUCCESS',
    data: updated.currentSessionLocation,
  };
};

const changeDeliveryPartnerStatus = async (
  currentUser: TCurrentUser,
  payload: { status: 'IDLE' | 'OFFLINE' },
) => {
  if (currentUser.role !== 'DELIVERY_PARTNER') {
    throw new AppError(httpStatus.FORBIDDEN, 'ONLY_PARTNERS_CAN_CHANGE_STATUS');
  }

  const partner = await DeliveryPartner.findOne({ userId: currentUser.userId });

  if (!partner) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      'DELIVERY_PARTNER_NOT_FOUND_LOWER',
    );
  }

  const currentStatus = partner.operationalData?.currentStatus;

  if (payload.status === 'OFFLINE' && currentStatus !== 'IDLE') {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'OFFLINE_ALLOWED_ONLY_FROM_IDLE',
    );
  }

  if (payload.status === 'IDLE' && currentStatus !== 'OFFLINE') {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'IDLE_ALLOWED_ONLY_FROM_OFFLINE',
    );
  }

  const result = await DeliveryPartner.findOneAndUpdate(
    { userId: currentUser.userId },
    {
      $set: {
        'operationalData.currentStatus': payload.status,
        'operationalData.isWorking': payload.status === 'IDLE' ? true : false,
      },
    },
    { new: true, runValidators: true },
  );

  return {
    messageKey: 'STATUS_CHANGE_SUCCESS_TEMPLATE',
    variables: {
      fromStatus: String(currentStatus),
      toStatus: payload.status,
    },
    data: result?.operationalData?.currentStatus,
  };
};

// update doc image
const deliverPartnerDocImageUpload = async (
  file: string | undefined,
  data: TDeliveryPartnerImageDocuments,
  currentUser: TCurrentUser,
  deliveryPartnerId: string,
) => {
  const existingDeliveryPartner = await DeliveryPartner.findOne({
    userId: deliveryPartnerId,
  });
  if (!existingDeliveryPartner) {
    throw new AppError(httpStatus.NOT_FOUND, 'DELIVERY_PARTNER_NOT_FOUND');
  }

  if (currentUser?.role === 'FLEET_MANAGER') {
    if (
      currentUser?._id.toString() !==
      existingDeliveryPartner?.registeredBy?.id.toString()
    ) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'DOC_UPLOAD_UNAUTHORIZED_BANG',
      );
    }
  }

  // delete previous image if exists
  const docTitle = data?.docImageTitle;

  if (docTitle && existingDeliveryPartner?.documents?.[docTitle]) {
    const oldImage = existingDeliveryPartner?.documents?.[docTitle];
    deleteSingleImageFromCloudinary(oldImage).catch(() => undefined);
  }

  if (data.docImageTitle && file) {
    existingDeliveryPartner.documents = {
      ...existingDeliveryPartner.documents,
      [data.docImageTitle]: file,
    };
    if (data.docImageTitle === 'myPhoto') {
      existingDeliveryPartner.profilePhoto = file;
    }
    await existingDeliveryPartner.save();
  }

  return {
    messageKey: 'DOC_IMAGE_UPDATED_SUCCESS',
    existingDeliveryPartner: existingDeliveryPartner,
  };
};

//get all delivery partners
const getAllDeliveryPartnersFromDB = async (
  query: Record<string, unknown>,
  currentUser: TCurrentUser,
) => {
  if (currentUser?.role === 'FLEET_MANAGER') {
    query['registeredBy.id'] = currentUser?._id.toString();
  }

  const deliveryPartners = new QueryBuilder(DeliveryPartner.find(), query)
    .search(DeliveryPartnerSearchableFields)
    .filter()
    .sort()
    .paginate()
    .fields();

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
    messageKey: 'DELIVERY_PARTNERS_RETRIEVED_SUCCESS',
    meta,
    data,
  };
};

// get single delivery partner from db
const getSingleDeliveryPartnerFromDB = async (
  deliveryPartnerId: string,
  currentUser: TCurrentUser,
) => {
  if (
    currentUser?.role === 'DELIVERY_PARTNER' &&
    currentUser?.userId !== deliveryPartnerId
  ) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'ACCESS_DELIVERY_PARTNER_UNAUTHORIZED',
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
    throw new AppError(httpStatus.NOT_FOUND, 'DELIVERY_PARTNER_NOT_FOUND');
  }

  if (
    currentUser?.role === 'FLEET_MANAGER' &&
    existingDeliveryPartner?.registeredBy?.id.toString() !==
      currentUser?._id.toString()
  ) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'ACCESS_DELIVERY_PARTNER_UNAUTHORIZED',
    );
  }

  return {
    messageKey: 'DELIVERY_PARTNER_RETRIEVED_SUCCESS',
    data: existingDeliveryPartner,
  };
};

export const DeliveryPartnerServices = {
  updateDeliveryPartner,
  updateDeliveryPartnerLiveLocation,
  changeDeliveryPartnerStatus,
  deliverPartnerDocImageUpload,
  getAllDeliveryPartnersFromDB,
  getSingleDeliveryPartnerFromDB,
};
