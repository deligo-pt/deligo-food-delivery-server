/* eslint-disable @typescript-eslint/no-explicit-any */
import AppError from '../../errors/AppError';
import httpStatus from 'http-status';
import { AuthUser } from '../../constant/user.constant';
import { QueryBuilder } from '../../builder/QueryBuilder';
import { FleetManagerSearchableFields } from './fleet-manager.constant';
import {
  TFleetManager,
  TFleetManagerImageDocuments,
} from './fleet-manager.interface';
import { FleetManager } from './fleet-manager.model';
import { deleteSingleImageFromCloudinary } from '../../utils/deleteImage';
import { findUserByEmailOrId } from '../../utils/findUserByEmailOrId';

// Fleet Manager Update Service
const fleetManagerUpdate = async (
  fleetManagerId: string,
  payload: Partial<TFleetManager>,
  currentUser: AuthUser
) => {
  // ---------------------------------------------------------
  // Find Fleet Manager
  // ---------------------------------------------------------
  const existingFleetManager = await FleetManager.findOne({
    userId: fleetManagerId,
    isDeleted: false,
  });

  if (!existingFleetManager) {
    throw new AppError(httpStatus.NOT_FOUND, 'Fleet Manager not found.');
  }

  // ---------------------------------------------------------
  // Only the Fleet Manager can update their own profile
  // ---------------------------------------------------------
  const isSelf =
    currentUser.role === 'FLEET_MANAGER' &&
    currentUser.id === existingFleetManager.userId;

  if (!isSelf) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'You are not authorized to update this Fleet Manager.'
    );
  }

  // ---------------------------------------------------------
  // Ensure email is verified before self-update
  // ---------------------------------------------------------
  if (!existingFleetManager.isEmailVerified) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Please verify your email before updating your profile.'
    );
  }

  // ---------------------------------------------------------
  // Check if update is locked
  // ---------------------------------------------------------
  if (existingFleetManager.isUpdateLocked) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Fleet Manager update is locked. Please contact support.'
    );
  }

  // ---------------------------------------------------------
  // Perform Update
  // ---------------------------------------------------------
  const updatedFleetManager = await FleetManager.findOneAndUpdate(
    { userId: fleetManagerId },
    { $set: payload },
    { new: true }
  );

  if (!updatedFleetManager) {
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Failed to update Fleet Manager.'
    );
  }

  return updatedFleetManager;
};

// fleet manager doc image upload service
const fleetManagerDocImageUpload = async (
  file: string | undefined,
  data: TFleetManagerImageDocuments,
  currentUser: AuthUser,
  fleetManagerId: string
) => {
  const existingFleetManager = await FleetManager.findOne({
    userId: fleetManagerId,
    isDeleted: false,
  });
  if (!existingFleetManager) {
    throw new AppError(httpStatus.NOT_FOUND, 'Fleet Manager not found');
  }

  if (currentUser?.id !== fleetManagerId) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'You are not authorize to upload document image!'
    );
  }

  // delete previous image if exists
  const docTitle = data?.docImageTitle;

  if (docTitle && existingFleetManager?.documents?.[docTitle]) {
    const oldImage = existingFleetManager?.documents?.[docTitle];
    deleteSingleImageFromCloudinary(oldImage).catch((err) => {
      throw new AppError(httpStatus.BAD_REQUEST, err.message);
    });
  }

  if (data.docImageTitle && file) {
    existingFleetManager.documents = {
      ...existingFleetManager.documents,
      [data.docImageTitle]: file,
    };
    await existingFleetManager.save();
  }

  return {
    message: 'Fleet Manager document image updated successfully',
    existingFleetManager,
  };
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
  currentUser: AuthUser
) => {
  const result = await findUserByEmailOrId({
    userId: currentUser?.id,
    isDeleted: false,
  });
  const user = result?.user;
  if (user?.role === 'FLEET_MANAGER' && user?.id !== fleetManagerId) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'You are not authorize to access this fleet manager!'
    );
  }
  let existingFleetManager;

  const existingFleetManager = await FleetManager.findOne({
    fleetManagerId,
    isDeleted: false,
  });
  if (!existingFleetManager) {
    throw new AppError(httpStatus.NOT_FOUND, 'Fleet Manager not found!');
  }

  return existingFleetManager;
};

export const FleetManagerServices = {
  fleetManagerUpdate,
  fleetManagerDocImageUpload,
  getAllFleetManagersFromDb,
  getSingleFleetManagerFromDB,
};
