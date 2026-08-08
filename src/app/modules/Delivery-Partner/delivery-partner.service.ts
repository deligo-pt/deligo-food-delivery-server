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
import { FleetManager } from '../Fleet-Manager/fleet-manager.model';
import mongoose from 'mongoose';

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
  }).populate('profileId', 'isUpdateLocked currentFleetManagerId');

  if (!existingDeliveryPartner) {
    throw new AppError(httpStatus.NOT_FOUND, 'NOT_FOUND_MESSAGE', {
      entity: 'Delivery Partner Profile',
    });
  }

  const partnerProfile = existingDeliveryPartner.profileId as any;
  if (!partnerProfile) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      'DELIVERY_PARTNER_PROFILE_NOT_FOUND_BANG',
    );
  }

  if (!existingDeliveryPartner.isEmailVerified) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'EMAIL_VERIFICATION_REQUIRED_FOR_UPDATE',
    );
  }

  // ---------------------------------------------------------
  // Check if update is locked
  // ---------------------------------------------------------
  if (
    (currentUser.role === 'FLEET_MANAGER' ||
      currentUser.role === 'DELIVERY_PARTNER') &&
    partnerProfile.isUpdateLocked
  ) {
    throw new AppError(httpStatus.BAD_REQUEST, 'PROFILE_UPDATE_LOCKED');
  }

  // ---------------------------------------------------------
  // Authorization Logic
  // ---------------------------------------------------------

  // Delivery Partner updating their own profile
  if (currentUser.role === 'DELIVERY_PARTNER') {
    if (existingDeliveryPartner.userId !== currentUser?.userId) {
      throw new AppError(httpStatus.FORBIDDEN, 'COMMON_ACCESS_DENIED', {
        reason: 'You do not have permission to modify this profile.',
      });
    }
  }

  // Admin/SuperAdmin updating a partner they registered
  if (
    currentUser.role === 'FLEET_MANAGER' &&
    partnerProfile.currentFleetManagerId?.toString() !==
      currentUser?._id.toString()
  ) {
    throw new AppError(httpStatus.FORBIDDEN, 'COMMON_ACCESS_DENIED', {
      reason: 'You do not have permission to modify this account.',
    });
  }

  // ---------------------------------------------------------
  // Update the delivery partner
  // ---------------------------------------------------------
  const updatedDeliveryPartner = await DeliveryPartner.findOneAndUpdate(
    { userId: deliveryPartnerId },
    { $set: payload },
    { new: true },
  );

  if (!updatedDeliveryPartner) {
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'COMMON_OPERATION_FAILED',
      {
        operation: 'update profile details. Please try again',
      },
    );
  }

  return {
    messageKey: 'COMMON_UPDATED_SUCCESS',
    variables: { entity: 'Profile Details' },
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
    throw new AppError(httpStatus.FORBIDDEN, 'COMMON_ACCESS_DENIED', {
      reason: 'You are not authorized to update real-time location.',
    });
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
    throw new AppError(httpStatus.BAD_REQUEST, 'GEO_ACCURACY_EXCEEDED');
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
    throw new AppError(httpStatus.NOT_FOUND, 'NOT_FOUND_MESSAGE', {
      entity: 'Delivery Partner Account',
    });
  }

  return {
    success: true,
    messageKey: 'COMMON_UPDATED_SUCCESS',
    variables: { entity: 'Live Location' },
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
    throw new AppError(httpStatus.NOT_FOUND, 'NOT_FOUND_MESSAGE', {
      entity: 'Delivery Partner Account',
    });
  }

  if (currentUser?.role === 'FLEET_MANAGER') {
    if (
      currentUser?._id.toString() !==
      existingDeliveryPartner?.currentFleetManagerId?.toString()
    ) {
      throw new AppError(httpStatus.BAD_REQUEST, 'COMMON_ACCESS_DENIED', {
        reason: 'You do not have permission to upload documents.',
      });
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
    messageKey: 'VERIFICATION_DOCUMENT_UPLOADED_SUCCESS',
    variables: undefined,
    existingDeliveryPartner: existingDeliveryPartner,
  };
};

//get all delivery partners
const getAllDeliveryPartnersFromDB = async (
  query: Record<string, unknown>,
  currentUser: TCurrentUser,
) => {
  if (currentUser?.role === 'FLEET_MANAGER') {
    query['currentFleetManagerId'] = currentUser?._id.toString();
  }

  const deliveryPartners = new QueryBuilder(DeliveryPartner.find(), query)
    .search(DeliveryPartnerSearchableFields)
    .filter()
    .sort()
    .paginate()
    .fields();

  const populateOptions = getPopulateOptions(currentUser.role, {
    registeredByWithModel: 'name userId role',
    currentFleetManagerWithDetails: 'name userId role',
    approvedBy: 'name userId role',
    rejectedBy: 'name userId role',
    blockedBy: 'name userId role',
  });
  populateOptions.forEach((option) => {
    deliveryPartners.modelQuery = deliveryPartners.modelQuery.populate(option);
  });

  const meta = await deliveryPartners.countTotal();

  const data = await deliveryPartners.modelQuery.lean();

  return {
    messageKey: 'DATA_LOAD_SUCCESS',
    variables: { entity: 'Delivery Partners', isPlural: true },
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
    throw new AppError(httpStatus.FORBIDDEN, 'COMMON_ACCESS_DENIED', {
      reason: 'You do not have permission to view this partner profile.',
    });
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
    throw new AppError(httpStatus.NOT_FOUND, 'NOT_FOUND_MESSAGE', {
      entity: 'Delivery Partner Account',
    });
  }

  if (
    currentUser?.role === 'FLEET_MANAGER' &&
    existingDeliveryPartner?.currentFleetManagerId?.toString() !==
      currentUser?._id.toString()
  ) {
    throw new AppError(httpStatus.FORBIDDEN, 'COMMON_ACCESS_DENIED', {
      reason: 'You do not have permission to view this partner profile.',
    });
  }

  const authUser = await AuthUser.findOne({
    userId: deliveryPartnerId,
  }).select('isEmailVerified isContactNumberVerified');

  return {
    messageKey: 'DATA_LOAD_SUCCESS',
    variables: { entity: 'Delivery Partner' },
    data: {
      ...existingDeliveryPartner.toObject(),
      isEmailVerified: authUser?.isEmailVerified ?? false,
      isContactNumberVerified: authUser?.isContactNumberVerified ?? false,
    },
  };
};

const assignDeliveryPartnerToFleetManager = async (
  deliveryPartnerId: string,
  fleetManagerId: string,
) => {
  const deliveryPartnerProfile = await DeliveryPartner.findOne({
    userId: deliveryPartnerId,
    role: 'DELIVERY_PARTNER',
    isDeleted: false,
  }).select('status currentFleetManagerId isDeleted registeredBy');

  if (!deliveryPartnerProfile) {
    throw new AppError(httpStatus.NOT_FOUND, 'NOT_FOUND_MESSAGE', {
      entity: 'Delivery Partner Account',
    });
  }

  if (
    deliveryPartnerProfile.currentFleetManagerId &&
    deliveryPartnerProfile.currentFleetManagerId.toString() !==
      fleetManagerId.toString()
  ) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'DELIVERY_PARTNER_ALREADY_ASSIGNED_TO_FLEET_MANAGER',
    );
  }

  if (
    deliveryPartnerProfile.currentFleetManagerId &&
    deliveryPartnerProfile.currentFleetManagerId.toString() ===
      fleetManagerId.toString()
  ) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'DELIVERY_PARTNER_ALREADY_ASSIGNED_TO_THIS_FLEET_MANAGER',
    );
  }

  const fleetManagerProfile = await FleetManager.findOne({
    _id: fleetManagerId.toString(),
    role: 'FLEET_MANAGER',
    isDeleted: false,
  }).select('_id status');

  if (!fleetManagerProfile) {
    throw new AppError(httpStatus.NOT_FOUND, 'NOT_FOUND_MESSAGE', {
      entity: 'Fleet Manager Profile',
    });
  }

  if (fleetManagerProfile.status !== 'APPROVED') {
    throw new AppError(httpStatus.BAD_REQUEST, 'FLEET_MANAGER_NOT_APPROVED');
  }

  if (!deliveryPartnerProfile || deliveryPartnerProfile.isDeleted) {
    throw new AppError(httpStatus.NOT_FOUND, 'NOT_FOUND_MESSAGE', {
      entity: 'Delivery Partner Account',
    });
  }

  // if (!deliveryPartnerProfile?.registeredBy?.model) {
  //   deliveryPartnerProfile.registeredBy = {
  //     id: new mongoose.Types.ObjectId(fleetManagerProfile._id),
  //     model: 'FleetManager',
  //   };
  // }

  deliveryPartnerProfile.currentFleetManagerId = new mongoose.Types.ObjectId(
    fleetManagerProfile._id,
  );

  await deliveryPartnerProfile.save();

  return {
    messageKey: 'COMMON_UPDATED_SUCCESS',
    variables: { entity: 'Profile Details' },
    data: deliveryPartnerProfile,
  };
};

export const DeliveryPartnerServices = {
  updateDeliveryPartner,
  updateDeliveryPartnerLiveLocation,
  changeDeliveryPartnerStatus,
  deliverPartnerDocImageUpload,
  getAllDeliveryPartnersFromDB,
  getSingleDeliveryPartnerFromDB,
  assignDeliveryPartnerToFleetManager,
};
