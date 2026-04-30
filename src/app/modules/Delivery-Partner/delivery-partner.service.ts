/* eslint-disable @typescript-eslint/no-explicit-any */
import { QueryBuilder } from '../../builder/QueryBuilder';
import AppError from '../../errors/AppError';
import httpStatus from 'http-status';
import { AuthUser } from '../../constant/user.constant';
import { TDeliveryPartner } from './delivery-partner.interface';
import { DeliveryPartner } from './delivery-partner.model';
import { DeliveryPartnerSearchableFields } from './delivery-partner.constant';
import { getPopulateOptions } from '../../utils/getPopulateOptions';
import { TLiveLocationPayload } from '../../constant/GlobalInterface/global.interface';
import { generateReferralCode } from '../../utils/generateReferralCode';

// update delivery partner profile service
const updateDeliveryPartner = async (
  payload: Partial<TDeliveryPartner>,
  deliveryPartnerId: string,
  currentUser: AuthUser,
) => {
  // ---------------------------------------------------------
  // Check if target delivery partner exists
  // ---------------------------------------------------------
  const existingDeliveryPartner = await DeliveryPartner.findOne({
    customUserId: deliveryPartnerId,
  });

  if (!existingDeliveryPartner) {
    throw new AppError(httpStatus.NOT_FOUND, 'Delivery Partner not found!');
  }

  // if (!existingDeliveryPartner.isEmailVerified) {
  //   throw new AppError(
  //     httpStatus.BAD_REQUEST,
  //     'Please verify your email before updating your profile.',
  //   );
  // }

  // -----------------------------
  // Referral Code Generation (New Logic)
  // -----------------------------
  if (!currentUser.referralCode) {
    const firstName = currentUser.name.firstName || 'USER';
    const newReferralCode = await generateReferralCode(firstName);

    payload.referralCode = newReferralCode;
  }

  // ---------------------------------------------------------
  // Check if update is locked
  // ---------------------------------------------------------
  if (
    (currentUser.role === 'FLEET_MANAGER' ||
      currentUser.role === 'DELIVERY_PARTNER') &&
    existingDeliveryPartner.isUpdateLocked
  ) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Delivery Partner update is locked. Please contact support.',
    );
  }

  // ---------------------------------------------------------
  // Authorization Logic
  // ---------------------------------------------------------

  // Delivery Partner updating their own profile
  if (currentUser.role === 'DELIVERY_PARTNER') {
    if (existingDeliveryPartner.customUserId !== currentUser?.customUserId) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        'You are not authorized to update this profile.',
      );
    }
  }

  // Admin/SuperAdmin updating a partner they registered
  // if (
  //   currentUser.role === 'FLEET_MANAGER' &&
  //   existingDeliveryPartner.registeredBy?.id.toString() !==
  //     currentUser?._id.toString()
  // ) {
  //   throw new AppError(
  //     httpStatus.FORBIDDEN,
  //     'You are not authorized to update this Delivery Partner.',
  //   );
  // }

  // ---------------------------------------------------------
  // Update the delivery partner
  // ---------------------------------------------------------
  const updatedDeliveryPartner = await DeliveryPartner.findOneAndUpdate(
    { customUserId: deliveryPartnerId },
    { $set: payload },
    { new: true },
  );

  if (!updatedDeliveryPartner) {
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Failed to update Delivery Partner.',
    );
  }

  return updatedDeliveryPartner;
};

// update delivery partner live location
const updateDeliveryPartnerLiveLocation = async (
  payload: TLiveLocationPayload,
  currentUser: AuthUser,
  deliveryPartnerId?: string,
) => {
  if (currentUser.role !== 'DELIVERY_PARTNER') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'Only delivery partners can update live location',
    );
  }

  if (deliveryPartnerId && currentUser.customUserId !== deliveryPartnerId) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'You are not authorize to update live location!',
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
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Geo accuracy cannot be greater than 100',
    );
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
    { customUserId: currentUser.customUserId, isDeleted: false },
    { $set: updateData },
    {
      new: true,
      runValidators: true,
      projection: { currentSessionLocation: 1 },
    },
  );

  if (!updated) {
    throw new AppError(httpStatus.NOT_FOUND, 'Delivery Partner not found');
  }

  return {
    success: true,
    message: 'Live location updated successfully',
    data: updated.currentSessionLocation,
  };
};

const changeDeliveryPartnerStatus = async (
  currentUser: AuthUser,
  payload: { status: 'IDLE' | 'OFFLINE' },
) => {
  if (currentUser.role !== 'DELIVERY_PARTNER') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'Only delivery partners can change their status',
    );
  }

  const partner = await DeliveryPartner.findOne({
    customUserId: currentUser.customUserId,
  });

  if (!partner) {
    throw new AppError(httpStatus.NOT_FOUND, 'Delivery partner not found');
  }

  const currentStatus = partner.operationalData?.currentStatus;

  if (payload.status === 'OFFLINE' && currentStatus !== 'IDLE') {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'You can only go OFFLINE if your current status is IDLE',
    );
  }

  if (payload.status === 'IDLE' && currentStatus !== 'OFFLINE') {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'You can only go IDLE if your current status is OFFLINE',
    );
  }

  const result = await DeliveryPartner.findOneAndUpdate(
    { customUserId: currentUser.customUserId },
    {
      $set: {
        'operationalData.currentStatus': payload.status,
        'operationalData.isWorking': payload.status === 'IDLE' ? true : false,
      },
    },
    { new: true, runValidators: true },
  );

  return {
    message: `Status successfully changed from ${currentStatus} to ${payload.status}`,
    data: result?.operationalData?.currentStatus,
  };
};

//get all delivery partners
const getAllDeliveryPartnersFromDB = async (
  query: Record<string, unknown>,
  currentUser: AuthUser,
) => {
  if (currentUser?.role === 'FLEET_MANAGER') {
    query['registeredBy.id'] = currentUser?._id.toString();
  }

  const deliveryPartners = new QueryBuilder(DeliveryPartner.find(), query)
    .fields()
    .paginate()
    .sort()
    .filter()
    .search(DeliveryPartnerSearchableFields);

  const populateOptions = getPopulateOptions(currentUser.role, {
    approvedBy: 'name customUserId role',
    rejectedBy: 'name customUserId role',
    blockedBy: 'name customUserId role',
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
  currentUser: AuthUser,
) => {
  if (
    currentUser?.role === 'DELIVERY_PARTNER' &&
    currentUser?.customUserId !== deliveryPartnerId
  ) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'You are not authorized to access this delivery partner',
    );
  }

  let existingDeliveryPartner;

  if (currentUser?.role !== 'ADMIN' && currentUser?.role !== 'SUPER_ADMIN') {
    existingDeliveryPartner = await DeliveryPartner.findOne({
      customUserId: deliveryPartnerId,
      isDeleted: false,
    });
  } else {
    existingDeliveryPartner = await DeliveryPartner.findOne({
      customUserId: deliveryPartnerId,
    });
  }

  if (!existingDeliveryPartner) {
    throw new AppError(httpStatus.NOT_FOUND, 'Delivery Partner not found!');
  }

  if (
    currentUser?.role === 'FLEET_MANAGER' &&
    existingDeliveryPartner?.registeredBy?.id.toString() !==
      currentUser?._id.toString()
  ) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'You are not authorized to access this delivery partner',
    );
  }

  return existingDeliveryPartner;
};

export const DeliveryPartnerServices = {
  updateDeliveryPartner,
  updateDeliveryPartnerLiveLocation,
  changeDeliveryPartnerStatus,
  getAllDeliveryPartnersFromDB,
  getSingleDeliveryPartnerFromDB,
};
