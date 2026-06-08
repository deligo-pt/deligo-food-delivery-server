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
    throw new AppError(httpStatus.NOT_FOUND, 'Fleet Manager not found.');
  }

  const fleetProfile = existingFleetManager.profileId as any;
  if (!fleetProfile) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      'Fleet Manager profile not found.',
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
    throw new AppError(
      httpStatus.FORBIDDEN,
      'You are not authorized to update this Fleet Manager.',
    );
  }

  // ---------------------------------------------------------
  // Ensure email is verified before self-update
  // ---------------------------------------------------------
  if (!existingFleetManager.isEmailVerified) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Please verify your email before updating your profile.',
    );
  }

  if (payload.businessLocation) {
    const { longitude, latitude, geoAccuracy = 0 } = payload.businessLocation;

    if (geoAccuracy !== undefined && geoAccuracy > 100) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'Geo accuracy must be less than or equal to 100.',
      );
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
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Fleet Manager update is locked. Please contact support.',
    );
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
      'Failed to update Fleet Manager.',
    );
  }

  return updatedFleetManager;
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
    throw new AppError(httpStatus.NOT_FOUND, 'Fleet Manager not found');
  }

  const isStaff = ['ADMIN', 'SUPER_ADMIN'].includes(currentUser.role);
  const isOwner =
    currentUser.role === 'FLEET_MANAGER' &&
    currentUser.userId === existingFleetManager.userId;

  if (!isStaff && !isOwner) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'You are not authorized for this action.',
    );
  }

  // ---------------------------------------------------------
  // Check if update is locked
  // ---------------------------------------------------------
  if (existingFleetManager.isUpdateLocked && !isStaff) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Fleet Manager update is locked. Please contact support.',
    );
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
        `Maximum 3 images are allowed for ${payload.docImageTitle}. You already have ${previousImages.length} and trying to add ${docImageUrls.length}.`,
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
    message: 'Fleet Manager document image updated successfully',
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
    throw new AppError(httpStatus.NOT_FOUND, 'Fleet Manager not found');

  const isStaff = ['ADMIN', 'SUPER_ADMIN'].includes(currentUser.role);
  const isOwner = currentUser.userId === existingFleetManager.userId;
  if (!isStaff && !isOwner)
    throw new AppError(
      httpStatus.FORBIDDEN,
      'You are not authorized for this action.',
    );

  if (existingFleetManager.isUpdateLocked && !isStaff) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Profile is locked. Contact support.',
    );
  }

  const docArray = (existingFleetManager.documents as any)[docImageTitle];
  if (!Array.isArray(docArray) || !docArray.includes(imageUrl)) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      'Image not found in this document category',
    );
  }

  await deleteSingleImageFromCloudinary(imageUrl).catch((err) => {
    console.error('Cloudinary deletion failed:', err);
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
    message: 'Fleet Manager document image deleted successfully',
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
      'You are not authorize to access this fleet manager!',
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
    throw new AppError(httpStatus.NOT_FOUND, 'Fleet Manager not found!');
  }

  return existingFleetManager;
};

export const FleetManagerServices = {
  fleetManagerUpdate,
  fleetManagerDocImageUpload,
  deleteFleetManagerDocument,
  getAllFleetManagersFromDb,
  getSingleFleetManagerFromDB,
};
