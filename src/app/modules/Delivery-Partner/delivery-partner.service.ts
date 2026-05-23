/* eslint-disable no-unused-vars */
/* eslint-disable @typescript-eslint/no-unused-vars */
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
import mongoose from 'mongoose';
import { flattenObject } from '../../utils/flattenObject';

// update delivery partner profile service
const updateDeliveryPartner = async (
  payload: Partial<TDeliveryPartner>,
  deliveryPartnerCustomId: string,
  currentUser: TCurrentUser,
) => {
  const centralAuthUser = await AuthUser.findOne({
    userCustomId: deliveryPartnerCustomId,
    isDeleted: false,
  });
  if (!centralAuthUser) {
    throw new AppError(httpStatus.NOT_FOUND, 'Delivery Partner not found!');
  }

  if (!centralAuthUser.isEmailVerified) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Please verify your email before updating your profile.',
    );
  }

  const existingDeliveryPartner = await DeliveryPartner.findOne({
    userCustomId: deliveryPartnerCustomId,
  });
  if (!existingDeliveryPartner) {
    throw new AppError(httpStatus.NOT_FOUND, 'Delivery Partner not found!');
  }

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

  if (
    currentUser.role === 'DELIVERY_PARTNER' &&
    existingDeliveryPartner.userCustomId !== currentUser?.userCustomId
  ) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'You are not authorized to update this profile.',
    );
  }

  if (
    currentUser.role === 'FLEET_MANAGER' &&
    existingDeliveryPartner.registeredBy?.id.toString() !==
      currentUser?._id.toString()
  ) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'You are not authorized to update this Delivery Partner.',
    );
  }

  const updatedFields = Object.keys(payload);
  const projectionFields = [...updatedFields, 'status', 'updatedAt'].join(' ');

  if (
    currentUser.role === 'DELIVERY_PARTNER' ||
    currentUser.role === 'FLEET_MANAGER'
  ) {
    payload.status = 'PENDING';
  }

  const flattenedUpdateData = flattenObject(payload);

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    if (payload.status === 'PENDING') {
      await AuthUser.findOneAndUpdate(
        { userCustomId: deliveryPartnerCustomId },
        { $set: { status: 'PENDING' } },
        { session },
      );
    }

    const updatedDeliveryPartner = await DeliveryPartner.findOneAndUpdate(
      { userCustomId: deliveryPartnerCustomId },
      { $set: flattenedUpdateData },
      {
        new: true,
        session,
        runValidators: true,
      },
    ).select(projectionFields);

    if (!updatedDeliveryPartner) {
      throw new AppError(
        httpStatus.INTERNAL_SERVER_ERROR,
        'Failed to update Delivery Partner.',
      );
    }

    await session.commitTransaction();
    session.endSession();

    return updatedDeliveryPartner;
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

// update delivery partner live location
const updateDeliveryPartnerLiveLocation = async (
  payload: TLiveLocationPayload,
  currentUser: TCurrentUser,
  deliveryPartnerCustomId?: string,
) => {
  if (currentUser.role !== 'DELIVERY_PARTNER') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'Only delivery partners can update live location',
    );
  }

  if (
    deliveryPartnerCustomId &&
    currentUser.userCustomId !== deliveryPartnerCustomId
  ) {
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
    { userCustomId: currentUser.userCustomId },
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

// update doc image
const deliverPartnerDocImageUpload = async (
  file: string | undefined,
  data: TDeliveryPartnerImageDocuments,
  currentUser: TCurrentUser,
  deliveryPartnerCustomId: string,
) => {
  const existingDeliveryPartner = await DeliveryPartner.findOne({
    userCustomId: deliveryPartnerCustomId,
  });
  if (!existingDeliveryPartner) {
    throw new AppError(httpStatus.NOT_FOUND, 'Delivery Partner not found');
  }

  if (currentUser?.role === 'FLEET_MANAGER') {
    if (
      currentUser?._id.toString() !==
      existingDeliveryPartner?.registeredBy?.id.toString()
    ) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'You are not authorize to upload document image!',
      );
    }
  }

  // delete previous image if exists
  const docTitle = data?.docImageTitle;

  if (!docTitle || !file) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Document title and file must be provided',
    );
  }

  if (existingDeliveryPartner?.documents?.[docTitle]) {
    const oldImage = existingDeliveryPartner?.documents?.[docTitle];
    deleteSingleImageFromCloudinary(oldImage).catch((err) => {
      console.error(err);
    });
  }

  const updateData: Record<string, any> = {
    [`documents.${docTitle}`]: file,
  };

  if (
    currentUser.role === 'DELIVERY_PARTNER' ||
    currentUser.role === 'FLEET_MANAGER'
  ) {
    updateData['status'] = 'PENDING';
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    if (updateData['status'] === 'PENDING') {
      await AuthUser.findOneAndUpdate(
        { userCustomId: deliveryPartnerCustomId },
        { $set: { status: 'PENDING' } },
        { session },
      );
    }

    const updatedDeliveryPartner = await DeliveryPartner.findOneAndUpdate(
      { userCustomId: deliveryPartnerCustomId },
      { $set: updateData },
      {
        new: true,
        session,
        runValidators: true,
      },
    ).select('userCustomId name status documents updatedAt');

    if (!updatedDeliveryPartner) {
      throw new AppError(
        httpStatus.INTERNAL_SERVER_ERROR,
        'Failed to update document image.',
      );
    }

    await session.commitTransaction();
    session.endSession();

    return updatedDeliveryPartner;
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

const changeDeliveryPartnerStatus = async (
  currentUser: TCurrentUser,
  payload: { status: 'IDLE' | 'OFFLINE' },
) => {
  if (currentUser.role !== 'DELIVERY_PARTNER') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'Only delivery partners can change their status',
    );
  }

  const partner = await DeliveryPartner.findOne({
    userCustomId: currentUser.userCustomId,
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
    { userCustomId: currentUser.userCustomId },
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
  currentUser: TCurrentUser,
) => {
  if (currentUser?.role === 'FLEET_MANAGER') {
    const fleetManagedPartners = await DeliveryPartner.find({
      'registeredBy.id': currentUser?._id.toString(),
    }).select('_id');

    const partnerObjectIds = fleetManagedPartners.map((partner) => partner._id);

    query['userObjectId'] = { $in: partnerObjectIds };
  }

  query['role'] = 'DELIVERY_PARTNER';
  const authBaseQuery: Record<string, any> = {};

  if (currentUser?.role !== 'ADMIN' && currentUser?.role !== 'SUPER_ADMIN') {
    authBaseQuery.isDeleted = false;
  }

  const deliveryPartnersQuery = new QueryBuilder(
    AuthUser.find(authBaseQuery),
    query,
  )
    .fields()
    .paginate()
    .sort()
    .filter()
    .search(DeliveryPartnerSearchableFields);

  deliveryPartnersQuery.modelQuery = deliveryPartnersQuery.modelQuery.populate({
    path: 'userObjectId',
    populate: [
      { path: 'approvedBy', select: 'name userCustomId role' },
      { path: 'rejectedBy', select: 'name userCustomId role' },
      { path: 'blockedBy', select: 'name userCustomId role' },
    ],
  });

  const meta = await deliveryPartnersQuery.countTotal();

  const rawAuthUsers = await deliveryPartnersQuery.modelQuery;

  const mergedData = rawAuthUsers.map((authUserDoc) => {
    const authUserObj = authUserDoc.toObject();
    const profileData = authUserObj.userObjectId as unknown as TDeliveryPartner;

    if (!profileData) {
      return authUserObj;
    }

    const {
      password,
      passwordResetToken,
      passwordResetTokenExpiresAt,
      passwordChangedAt,
      userObjectId,
      ...cleanAuthData
    } = authUserObj;

    return {
      ...cleanAuthData,
      ...profileData,
    };
  });

  return {
    meta,
    data: mergedData,
  };
};

// get single delivery partner from db
const getSingleDeliveryPartnerFromDB = async (
  deliveryPartnerCustomId: string,
  currentUser: TCurrentUser,
) => {
  if (
    currentUser?.role === 'DELIVERY_PARTNER' &&
    currentUser?.userCustomId !== deliveryPartnerCustomId
  ) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'You are not authorized to access this delivery partner',
    );
  }

  let authUserData;

  if (currentUser?.role !== 'ADMIN' && currentUser?.role !== 'SUPER_ADMIN') {
    authUserData = await AuthUser.findOne({
      userCustomId: deliveryPartnerCustomId,
      isDeleted: false,
    }).populate('userObjectId');
  } else {
    authUserData = await AuthUser.findOne({
      userCustomId: deliveryPartnerCustomId,
    }).populate('userObjectId');
  }

  if (!authUserData) {
    throw new AppError(httpStatus.NOT_FOUND, 'Delivery Partner not found!');
  }

  const authUserObj = authUserData.toObject();
  const profileData = authUserObj.userObjectId as unknown as TDeliveryPartner;

  if (!profileData) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      'Delivery Partner Profile details missing!',
    );
  }

  if (
    currentUser?.role === 'FLEET_MANAGER' &&
    profileData?.registeredBy?.id.toString() !== currentUser?._id.toString()
  ) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'You are not authorized to access this delivery partner',
    );
  }

  const {
    password,
    passwordResetToken,
    passwordResetTokenExpiresAt,
    passwordChangedAt,
    userObjectId,
    ...cleanAuthData
  } = authUserObj;

  const combinedFlatResponse = {
    ...cleanAuthData,
    ...profileData,
  };

  return combinedFlatResponse;
};

export const DeliveryPartnerServices = {
  updateDeliveryPartner,
  updateDeliveryPartnerLiveLocation,
  changeDeliveryPartnerStatus,
  deliverPartnerDocImageUpload,
  getAllDeliveryPartnersFromDB,
  getSingleDeliveryPartnerFromDB,
};
