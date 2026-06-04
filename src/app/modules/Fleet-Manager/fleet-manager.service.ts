/* eslint-disable @typescript-eslint/no-explicit-any */
import AppError from '../../errors/AppError';
import httpStatus from 'http-status';
import { QueryBuilder } from '../../builder/QueryBuilder';
import { FleetManagerSearchableFields } from './fleet-manager.constant';
import {
  TFleetManager,
  TFleetManagerImageDocuments,
} from './fleet-manager.interface';
import { FleetManager } from './fleet-manager.model';
import { deleteSingleImageFromCloudinary } from '../../utils/deleteImage';
import { TAuthUser } from '../AuthUser/authUser.interface';
import { AuthUser } from '../AuthUser/authUser.model';

// Fleet Manager Update Service
const fleetManagerUpdate = async (
  fleetManagerCustomId: string,
  payload: Partial<TFleetManager>,
  currentUser: TAuthUser,
) => {
  // ---------------------------------------------------------
  // Find Fleet Manager
  // ---------------------------------------------------------
  const existingFleetManager = await FleetManager.findOne({
    userId: fleetManagerCustomId,
  });

  if (!existingFleetManager) {
    throw new AppError(httpStatus.NOT_FOUND, 'Fleet Manager not found.');
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
  if (
    currentUser.role === 'FLEET_MANAGER' &&
    existingFleetManager.isUpdateLocked
  ) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Fleet Manager update is locked. Please contact support.',
    );
  }

  // ---------------------------------------------------------
  // Perform Update
  // ---------------------------------------------------------
  const updatedFleetManager = await FleetManager.findOneAndUpdate(
    { userId: fleetManagerCustomId },
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
  currentUser: TAuthUser,
  fleetManagerCustomId: string,
) => {
  const { docImageTitle, docImageUrls } = payload;
  const existingFleetManager = await FleetManager.findOne({
    userId: fleetManagerCustomId,
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
  currentUser: TAuthUser,
  fleetManagerCustomId: string,
) => {
  const { docImageTitle, imageUrl } = payload;
  const existingFleetManager = await FleetManager.findOne({
    userId: fleetManagerCustomId,
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
  await existingFleetManager.save();

  return {
    message: 'Fleet Manager document image deleted successfully',
    data: existingFleetManager.documents,
  };
};
// get all fleet managers
const getAllFleetManagersFromDb = async (query: Record<string, unknown>) => {
  const authBaseQuery: Record<string, any> = {
    role: 'FLEET_MANAGER',
    isDeleted: false,
  };

  const fleetManagersQuery = new QueryBuilder(
    AuthUser.find(authBaseQuery).lean(),
    query,
  )
    .search(['email', 'userId'])
    .filter()
    .sort()
    .paginate()
    .fields();

  fleetManagersQuery.modelQuery = fleetManagersQuery.modelQuery.populate([
    {
      path: 'userObjectId',
      populate: [
        {
          path: 'registeredBy',
          select: 'name userId role',
        },
      ],
    },
    { path: 'approvedBy', select: 'name userId role' },
    { path: 'rejectedBy', select: 'name userId role' },
    { path: 'blockedBy', select: 'name userId role' },
  ]);

  const meta = await fleetManagersQuery.countTotal();
  const rawAuthUsers = await fleetManagersQuery.modelQuery;

  const mergedData = rawAuthUsers.map((authUserObj: any) => {
    const profileData = authUserObj.userObjectId;

    if (!profileData) {
      return authUserObj;
    }

    const {
      password,
      passwordResetToken,
      passwordResetTokenExpiresAt,
      passwordChangedAt,
      userObjectId,
      _id: authUserId,
      ...cleanAuthData
    } = authUserObj;

    const { _id: profileId, ...cleanProfileData } = profileData;

    return {
      _id: authUserId,
      profileId: profileId,
      ...cleanAuthData,
      ...cleanProfileData,
    };
  });

  return {
    meta,
    data: mergedData,
  };
};

// get single fleet manager from db
const getSingleFleetManagerFromDB = async (
  fleetManagerCustomId: string,
  currentUser: TAuthUser,
) => {
  if (
    currentUser?.role === 'FLEET_MANAGER' &&
    currentUser?.userId !== fleetManagerCustomId
  ) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'You are not authorized to access this fleet manager profile!',
    );
  }

  const authBaseQuery: Record<string, any> = {
    userId: fleetManagerCustomId,
    role: 'FLEET_MANAGER',
  };

  if (currentUser?.role !== 'ADMIN' && currentUser?.role !== 'SUPER_ADMIN') {
    authBaseQuery.isDeleted = false;
  }

  const authUserData = await AuthUser.findOne(authBaseQuery)
    .populate([
      {
        path: 'userObjectId',
        populate: [
          {
            path: 'registeredBy',
            select: 'name userId role',
          },
        ],
      },
      { path: 'approvedBy', select: 'name userId role' },
      { path: 'rejectedBy', select: 'name userId role' },
      { path: 'blockedBy', select: 'name userId role' },
    ])
    .lean();

  if (!authUserData) {
    throw new AppError(httpStatus.NOT_FOUND, 'Fleet Manager not found!');
  }

  const profileData = authUserData.userObjectId as any;
  if (!profileData) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      'Fleet Manager Profile details missing!',
    );
  }

  const {
    password,
    passwordResetToken,
    passwordResetTokenExpiresAt,
    passwordChangedAt,
    userObjectId,
    _id: authUserId,
    ...cleanAuthData
  } = authUserData;

  const { _id: profileId, ...cleanProfileData } = profileData;

  const combinedFlatResponse = {
    _id: authUserId,
    profileId: profileId,
    ...cleanAuthData,
    ...cleanProfileData,
  };

  return combinedFlatResponse;
};

export const FleetManagerServices = {
  fleetManagerUpdate,
  fleetManagerDocImageUpload,
  deleteFleetManagerDocument,
  getAllFleetManagersFromDb,
  getSingleFleetManagerFromDB,
};
