/* eslint-disable @typescript-eslint/no-explicit-any */
import AppError from '../../errors/AppError';
import httpStatus from 'http-status';
import { AuthUser } from '../../constant/user.constant';
import { QueryBuilder } from '../../builder/QueryBuilder';
import { FleetManagerSearchableFields } from './fleet-manager.constant';
import { TFleetManager } from './fleet-manager.interface';
import { FleetManager } from './fleet-manager.model';

// Fleet Manager Update Service
const fleetManagerUpdate = async (
  fleetManagerId: string,
  payload: Partial<TFleetManager>,
  currentUser: AuthUser,
) => {
  // ---------------------------------------------------------
  // Find Fleet Manager
  // ---------------------------------------------------------
  const existingFleetManager = await FleetManager.findOne({
    customUserId: fleetManagerId,
  });

  if (!existingFleetManager) {
    throw new AppError(httpStatus.NOT_FOUND, 'Fleet Manager not found.');
  }

  // ---------------------------------------------------------
  // Only the Fleet Manager can update their own profile
  // ---------------------------------------------------------
  const isSelf =
    currentUser.role === 'FLEET_MANAGER' &&
    currentUser.customUserId === existingFleetManager.customUserId;
  const isAdmin =
    currentUser.role === 'ADMIN' || currentUser.role === 'SUPER_ADMIN';

  if (!isSelf && !isAdmin) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'You are not authorized to update this Fleet Manager.',
    );
  }

  // ---------------------------------------------------------
  // Ensure email is verified before self-update
  // ---------------------------------------------------------
  // if (!existingFleetManager.isEmailVerified) {
  //   throw new AppError(
  //     httpStatus.BAD_REQUEST,
  //     'Please verify your email before updating your profile.',
  //   );
  // }

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
    { customUserId: fleetManagerId },
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

// get all fleet managers
const getAllFleetManagersFromDb = async (query: Record<string, unknown>) => {
  const fleetManagers = new QueryBuilder(FleetManager.find(), query)
    .fields()
    .paginate()
    .sort()
    .filter()
    .search(FleetManagerSearchableFields);
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
  currentUser: AuthUser,
) => {
  const userId = currentUser?.customUserId;
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
  getAllFleetManagersFromDb,
  getSingleFleetManagerFromDB,
};
