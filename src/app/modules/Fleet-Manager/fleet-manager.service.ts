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
    messageKey: 'FLEET_MANAGER_UPDATE_SUCCESS',
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
    messageKey: 'DOC_IMAGE_UPDATED_SUCCESS',
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
    messageKey: 'DOC_IMAGE_DELETED_SUCCESS',
    data: existingFleetManager.documents,
  };
};
// get all fleet managers
const getAllFleetManagersFromDb = async (query: Record<string, unknown>) => {
  const rawLatitude =
    query.latitude !== undefined ? String(query.latitude).trim() : '';
  const rawLongitude =
    query.longitude !== undefined ? String(query.longitude).trim() : '';

  const latitude = rawLatitude !== '' ? Number(rawLatitude) : undefined;
  const longitude = rawLongitude !== '' ? Number(rawLongitude) : undefined;

  const hasNearestSearch = rawLatitude !== '' || rawLongitude !== '';

  if (hasNearestSearch) {
    if (latitude === undefined || longitude === undefined) {
      throw new AppError(httpStatus.BAD_REQUEST, 'LATITUDE_LONGITUDE_REQUIRED');
    }

    if (
      Number.isNaN(latitude) ||
      Number.isNaN(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      throw new AppError(httpStatus.BAD_REQUEST, 'INVALID_LAT_LNG_COORDINATES');
    }

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Number(query.limit) || 10);
    const skip = (page - 1) * limit;

    const distanceOrder = String(query.distanceOrder || 'asc').toLowerCase();
    const distanceSort = distanceOrder === 'desc' ? -1 : 1;

    const maxDistanceKm =
      query.maxDistanceKm !== undefined ? Number(query.maxDistanceKm) : null;

    const maxDistanceMeters =
      maxDistanceKm !== null &&
      !Number.isNaN(maxDistanceKm) &&
      maxDistanceKm > 0
        ? maxDistanceKm * 1000
        : undefined;

    const nearestFleetManagers = await DeliveryPartner.aggregate([
      {
        $geoNear: {
          near: {
            type: 'Point',
            coordinates: [longitude, latitude],
          },
          distanceField: 'distanceInMeter',
          spherical: true,
          query: {
            isDeleted: false,
            'registeredBy.model': 'FleetManager',
          },
          ...(maxDistanceMeters ? { maxDistance: maxDistanceMeters } : {}),
        },
      },
      {
        $sort: {
          distanceInMeter: distanceSort,
        },
      },
      {
        $group: {
          _id: '$registeredBy.id',
          nearestDeliveryPartner: {
            $first: {
              _id: '$_id',
              userId: '$userId',
              name: '$name',
              profilePhoto: '$profilePhoto',
              email: '$email',
              distanceInMeter: '$distanceInMeter',
            },
          },
        },
      },
      {
        $lookup: {
          from: 'fleetmanagers',
          localField: '_id',
          foreignField: '_id',
          as: 'fleetManager',
        },
      },
      {
        $unwind: '$fleetManager',
      },
      {
        $match: {
          'fleetManager.isDeleted': false,
        },
      },
      {
        $set: {
          'nearestDeliveryPartner.distanceInKm': {
            $round: [
              { $divide: ['$nearestDeliveryPartner.distanceInMeter', 1000] },
              2,
            ],
          },
        },
      },
      {
        $project: {
          _id: 0,
          fleetManager: 1,
          nearestDeliveryPartner: 1,
        },
      },
      {
        $facet: {
          meta: [{ $count: 'total' }],
          data: [{ $skip: skip }, { $limit: limit }],
        },
      },
    ]);

    const total = nearestFleetManagers?.[0]?.meta?.[0]?.total || 0;
    const data = (nearestFleetManagers?.[0]?.data || []).map((item: any) => ({
      ...item.fleetManager,
      nearestDeliveryPartner: item.nearestDeliveryPartner,
    }));

    return {
      messageKey: 'DATA_LOAD_SUCCESS',
      variables: { entity: 'Fleet Managers', isPlural: true },
      meta: {
        page,
        limit,
        total,
        totalPage: Math.ceil(total / limit),
      },
      data,
    };
  }

  const fleetManagers = new QueryBuilder(FleetManager.find(), query)
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

  return {
    messageKey: 'DATA_LOAD_SUCCESS',
    variables: { entity: 'Fleet Manager' },
    data: { existingFleetManager, deliveryPartners },
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
