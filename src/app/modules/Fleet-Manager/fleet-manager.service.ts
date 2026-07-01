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
import { TMessageKey } from '../../errors/messages';

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
    throw new AppError(httpStatus.NOT_FOUND, 'FLEET_MANAGER_NOT_FOUND_DOT');
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
    throw new AppError(httpStatus.FORBIDDEN, 'UPDATE_UNAUTHORIZED');
  }

  // ---------------------------------------------------------
  // Ensure email is verified before self-update
  // ---------------------------------------------------------
  if (!existingFleetManager.isEmailVerified) {
    throw new AppError(httpStatus.BAD_REQUEST, 'EMAIL_VERIFICATION_REQUIRED');
  }

  if (payload.businessLocation) {
    const { longitude, latitude, geoAccuracy = 0 } = payload.businessLocation;

    if (geoAccuracy !== undefined && geoAccuracy > 100) {
      throw new AppError(httpStatus.BAD_REQUEST, 'GEO_ACCURACY_MAX_100');
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
    throw new AppError(httpStatus.BAD_REQUEST, 'UPDATE_LOCKED_CONTACT_SUPPORT');
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
    throw new AppError(httpStatus.INTERNAL_SERVER_ERROR, 'UPDATE_FAILED');
  }

  return {
    messageKey: 'UPDATE_SUCCESS' as TMessageKey,
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
    throw new AppError(httpStatus.NOT_FOUND, 'FLEET_MANAGER_NOT_FOUND');
  }

  const isStaff = ['ADMIN', 'SUPER_ADMIN'].includes(currentUser.role);
  const isOwner =
    currentUser.role === 'FLEET_MANAGER' &&
    currentUser.userId === existingFleetManager.userId;

  if (!isStaff && !isOwner) {
    throw new AppError(httpStatus.FORBIDDEN, 'ACTION_UNAUTHORIZED');
  }

  // ---------------------------------------------------------
  // Check if update is locked
  // ---------------------------------------------------------
  if (existingFleetManager.isUpdateLocked && !isStaff) {
    throw new AppError(httpStatus.BAD_REQUEST, 'UPDATE_LOCKED_CONTACT_SUPPORT');
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
    messageKey: 'DOC_IMAGE_UPDATED_SUCCESS' as TMessageKey,
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
    throw new AppError(httpStatus.NOT_FOUND, 'FLEET_MANAGER_NOT_FOUND');

  const isStaff = ['ADMIN', 'SUPER_ADMIN'].includes(currentUser.role);
  const isOwner = currentUser.userId === existingFleetManager.userId;
  if (!isStaff && !isOwner)
    throw new AppError(httpStatus.FORBIDDEN, 'ACTION_UNAUTHORIZED');

  if (existingFleetManager.isUpdateLocked && !isStaff) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'PROFILE_LOCKED_CONTACT_SUPPORT',
    );
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
    messageKey: 'DOC_IMAGE_DELETED_SUCCESS' as TMessageKey,
    data: existingFleetManager.documents,
  };
};
// get all fleet managers
const getAllFleetManagersFromDb = async (query: Record<string, unknown>) => {
  const fleetManagers = new QueryBuilder(FleetManager.find(), query)
    .search(FleetManagerSearchableFields)
    .filter()
    .sort()
    .paginate()
    .fields();
  const meta = await fleetManagers.countTotal();

  const data = await fleetManagers.modelQuery;
  return {
    messageKey: 'FLEET_MANAGERS_RETRIEVED_SUCCESS' as TMessageKey,
    meta,
    data,
  };
};

// get single fleet manager
const getSingleFleetManagerFromDB = async (
  fleetManagerId: string,
  currentUser: TCurrentUser,
) => {
  const userId = currentUser?.userId;
  if (currentUser?.role === 'FLEET_MANAGER' && userId !== fleetManagerId) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'ACCESS_FLEET_MANAGER_UNAUTHORIZED_BANG',
    );
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

  return {
    messageKey: 'FLEET_MANAGER_RETRIEVED_SUCCESS' as TMessageKey,
    data: existingFleetManager,
  };
};

export const FleetManagerServices = {
  fleetManagerUpdate,
  fleetManagerDocImageUpload,
  deleteFleetManagerDocument,
  getAllFleetManagersFromDb,
  getSingleFleetManagerFromDB,
};
