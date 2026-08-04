/* eslint-disable @typescript-eslint/no-explicit-any */
import AppError from '../../errors/AppError';
import httpStatus from 'http-status';
import { TCurrentUser } from '../../constant/GlobalInterface/user.interface';
import { QueryBuilder } from '../../builder/QueryBuilder';
import { FleetManagerSearchableFields } from './fleet-manager.constant';
import {
  TFleetManager,
  TFleetManagerImageDocuments,
} from './fleet-manager.interface';
import { FleetManager } from './fleet-manager.model';
import { deleteSingleImageFromCloudinary } from '../../utils/deleteImage';
import { AuthUser } from '../AuthUser/authUser.model';
import { DeliveryPartner } from '../Delivery-Partner/delivery-partner.model';

// Fleet Manager Update Service
const fleetManagerUpdate = async (
  fleetManagerId: string,
  payload: Partial<TFleetManager>,
  currentUser: TCurrentUser,
) => {
  // ---------------------------------------------------------
  // Find Fleet Manager
  // ---------------------------------------------------------
  const existingFleetManager = await AuthUser.findOne({
    userId: fleetManagerId,
    isDeleted: false,
  }).populate('profileId', 'isUpdateLocked registeredBy');

  if (!existingFleetManager) {
    throw new AppError(httpStatus.NOT_FOUND, 'NOT_FOUND_MESSAGE', {
      entity: 'Fleet Manager Profile',
    });
  }

  const fleetProfile = existingFleetManager.profileId as any;
  if (!fleetProfile) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      'FLEET_MANAGER_PROFILE_NOT_FOUND_DOT',
    );
  }

  // ---------------------------------------------------------
  // Only the Fleet Manager can update their own profile
  // ---------------------------------------------------------

  const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(currentUser.role);

  const isSelf =
    currentUser.role === 'FLEET_MANAGER' &&
    currentUser.userId === existingFleetManager.userId;

  if (!isSelf && !isAdmin) {
    throw new AppError(httpStatus.FORBIDDEN, 'COMMON_ACCESS_DENIED', {
      reason: 'You do not have permission to update this account.',
    });
  }

  // ---------------------------------------------------------
  // Ensure email is verified before self-update
  // ---------------------------------------------------------
  if (!existingFleetManager.isEmailVerified) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'EMAIL_VERIFICATION_REQUIRED_FOR_UPDATE',
    );
  }

  if (payload.businessLocation) {
    const { longitude, latitude, geoAccuracy = 0 } = payload.businessLocation;

    if (geoAccuracy !== undefined && geoAccuracy > 100) {
      throw new AppError(httpStatus.BAD_REQUEST, 'GEO_ACCURACY_EXCEEDED');
    }
    const hasLng = typeof longitude === 'number';
    const hasLat = typeof latitude === 'number';

    if (hasLng && hasLat) {
      payload.currentSessionLocation = {
        type: 'Point',
        coordinates: [longitude, latitude],
        geoAccuracy: geoAccuracy,
        lastLocationUpdate: new Date(),
      };
    }
  }

  // ---------------------------------------------------------
  // Check if update is locked
  // ---------------------------------------------------------
  if (currentUser.role === 'FLEET_MANAGER' && fleetProfile.isUpdateLocked) {
    throw new AppError(httpStatus.BAD_REQUEST, 'PROFILE_UPDATE_LOCKED');
  }

  // ---------------------------------------------------------
  // Perform Update
  // ---------------------------------------------------------
  const updatedFleetManager = await FleetManager.findOneAndUpdate(
    { userId: fleetManagerId },
    { $set: payload },
    { new: true },
  );

  if (!updatedFleetManager) {
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'COMMON_OPERATION_FAILED',
      {
        operation: 'update fleet manager profile. Please try again',
      },
    );
  }

  return {
    messageKey: 'COMMON_UPDATED_SUCCESS',
    variables: { entity: 'Fleet Manager Profile' },
    data: updatedFleetManager,
  };
};

// fleet manager doc image upload service
const fleetManagerDocImageUpload = async (
  payload: TFleetManagerImageDocuments,
  currentUser: TCurrentUser,
  fleetManagerId: string,
) => {
  const { docImageTitle, docImageUrls } = payload;
  const existingFleetManager = await FleetManager.findOne({
    userId: fleetManagerId,
    isDeleted: false,
  });
  if (!existingFleetManager) {
    throw new AppError(httpStatus.NOT_FOUND, 'NOT_FOUND_MESSAGE', {
      entity: 'Fleet Manager Account',
    });
  }

  const isStaff = ['ADMIN', 'SUPER_ADMIN'].includes(currentUser.role);
  const isOwner =
    currentUser.role === 'FLEET_MANAGER' &&
    currentUser.userId === existingFleetManager.userId;

  if (!isStaff && !isOwner) {
    throw new AppError(httpStatus.FORBIDDEN, 'COMMON_ACCESS_DENIED', {
      reason: 'You do not have permission to perform this action.',
    });
  }

  // ---------------------------------------------------------
  // Check if update is locked
  // ---------------------------------------------------------
  if (existingFleetManager.isUpdateLocked && !isStaff) {
    throw new AppError(httpStatus.BAD_REQUEST, 'PROFILE_UPDATE_LOCKED');
  }

  if (docImageTitle && docImageUrls.length > 0) {
    const previousImages =
      existingFleetManager.documents?.[
        docImageTitle as keyof typeof existingFleetManager.documents
      ] || [];

    const allImages = [...previousImages, ...docImageUrls];
    const uniqueImages = [...new Set(allImages)];
    if (uniqueImages.length > 3) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'DOC_LIMIT_EXCEEDED_TEMPLATE',
        {
          docImageTitle: String(payload.docImageTitle),
          previousCount: previousImages.length,
          incomingCount: docImageUrls.length,
        },
      );
    }
    existingFleetManager.documents = {
      ...existingFleetManager.documents,
      [docImageTitle]: uniqueImages,
    } as any;
    await existingFleetManager.markModified('documents');
    if (docImageTitle === 'myPhoto') {
      existingFleetManager.profilePhoto = uniqueImages[0];
    }
    await existingFleetManager.save();
  }

  return {
    messageKey: 'VERIFICATION_DOCUMENT_UPLOADED_SUCCESS',
    variables: undefined,
    existingFleetManager,
  };
};

// Service to delete a specific document image from a fleet manager's profile
const deleteFleetManagerDocument = async (
  payload: { docImageTitle: string; imageUrl: string },
  currentUser: TCurrentUser,
  fleetManagerId: string,
) => {
  const { docImageTitle, imageUrl } = payload;
  const existingFleetManager = await FleetManager.findOne({
    userId: fleetManagerId,
  });
  if (!existingFleetManager)
    throw new AppError(httpStatus.NOT_FOUND, 'NOT_FOUND_MESSAGE', {
      entity: 'Fleet Manager Account',
    });

  const isStaff = ['ADMIN', 'SUPER_ADMIN'].includes(currentUser.role);
  const isOwner = currentUser.userId === existingFleetManager.userId;
  if (!isStaff && !isOwner)
    throw new AppError(httpStatus.FORBIDDEN, 'COMMON_ACCESS_DENIED', {
      reason: 'You do not have permission to perform this action.',
    });

  if (existingFleetManager.isUpdateLocked && !isStaff) {
    throw new AppError(httpStatus.BAD_REQUEST, 'FLEET_MANAGER_PROFILE_LOCKED');
  }

  const docArray = (existingFleetManager.documents as any)[docImageTitle];
  if (!Array.isArray(docArray) || !docArray.includes(imageUrl)) {
    throw new AppError(httpStatus.NOT_FOUND, 'IMAGE_NOT_FOUND_IN_CATEGORY');
  }

  await deleteSingleImageFromCloudinary(imageUrl).catch((err) => {
    void err;
  });

  existingFleetManager.documents = {
    ...existingFleetManager.documents,
    [docImageTitle]: docArray.filter((url: string) => url !== imageUrl),
  } as any;

  existingFleetManager.markModified('documents');
  if (
    docImageTitle === 'myPhoto' &&
    existingFleetManager.profilePhoto === imageUrl
  ) {
    existingFleetManager.profilePhoto = '';
  }
  await existingFleetManager.save();

  return {
    messageKey: 'COMMON_SOFT_DELETED_SUCCESS',
    variables: { entity: 'Document Image' },
    data: existingFleetManager.documents,
  };
};
// get all fleet managers
const getAllFleetManagersFromDb = async (query: Record<string, unknown>) => {
  const city = query.city !== undefined ? String(query.city).trim() : '';

  const baseQuery: Record<string, unknown> = { ...query };

  if (city) {
    baseQuery['businessLocation.city'] = {
      $regex: city,
      $options: 'i',
    };
  }

  delete baseQuery.city;
  delete baseQuery.latitude;
  delete baseQuery.longitude;
  delete baseQuery.maxDistanceKm;
  delete baseQuery.distanceOrder;

  const fleetManagers = new QueryBuilder(FleetManager.find(), baseQuery)
    .search(FleetManagerSearchableFields)
    .filter()
    .sort()
    .paginate()
    .fields();
  const meta = await fleetManagers.countTotal();

  const data = await fleetManagers.modelQuery;
  return {
    messageKey: 'DATA_LOAD_SUCCESS',
    variables: { entity: 'Fleet Managers', isPlural: true },
    meta,
    data,
  };
};

// get single fleet manager
const getSingleFleetManagerFromDB = async (
  fleetManagerId: string,
  currentUser: TCurrentUser,
  query: Record<string, unknown>,
) => {
  const userId = currentUser?.userId;
  if (currentUser?.role === 'FLEET_MANAGER' && userId !== fleetManagerId) {
    throw new AppError(httpStatus.BAD_REQUEST, 'COMMON_ACCESS_DENIED', {
      reason: 'You do not have permission to view this fleet manager profile.',
    });
  }
  let existingFleetManager;

  if (currentUser?.role === 'FLEET_MANAGER') {
    existingFleetManager = await FleetManager.findOne({
      userId,
      isDeleted: false,
    });
  } else {
    existingFleetManager = await FleetManager.findOne({
      userId: fleetManagerId,
    });
  }

  if (!existingFleetManager) {
    throw new AppError(httpStatus.NOT_FOUND, 'FLEET_MANAGER_NOT_FOUND_BANG');
  }

  const baseQuery = DeliveryPartner.find({
    'registeredBy.id': existingFleetManager._id,
    isDeleted: false,
  }).select('name profilePhoto email userId -_id');

  const deliveryPartnerQuery = new QueryBuilder(baseQuery, query)
    .search(['name', 'email'])
    .filter()
    .sort()
    .paginate()
    .fields();

  const deliveryPartners = await deliveryPartnerQuery.modelQuery;
  const meta = await deliveryPartnerQuery.countTotal();

  const authUser = await AuthUser.findOne({
    userId: existingFleetManager.userId,
  }).select('isEmailVerified isContactNumberVerified');

  return {
    messageKey: 'DATA_LOAD_SUCCESS',
    variables: { entity: 'Fleet Manager' },
    data: {
      existingFleetManager: {
        ...existingFleetManager.toObject(),
        isEmailVerified: authUser?.isEmailVerified ?? false,
        isContactNumberVerified: authUser?.isContactNumberVerified ?? false,
      },
      deliveryPartners,
    },
    meta,
  };
};

export const FleetManagerServices = {
  fleetManagerUpdate,
  fleetManagerDocImageUpload,
  deleteFleetManagerDocument,
  getAllFleetManagersFromDb,
  getSingleFleetManagerFromDB,
};
