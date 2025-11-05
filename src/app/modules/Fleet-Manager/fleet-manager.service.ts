/* eslint-disable @typescript-eslint/no-explicit-any */
import AppError from '../../errors/AppError';
import httpStatus from 'http-status';
import { AuthUser } from '../../constant/user.const';
import { QueryBuilder } from '../../builder/QueryBuilder';
import { FleetManagerSearchableFields } from './fleet-manager.constant';
import {
  TFleetManager,
  TFleetManagerImageDocuments,
} from './fleet-manager.interface';
import { FleetManager } from './fleet-manager.model';

// Fleet Manager Update Service
const fleetManagerUpdate = async (
  id: string,
  payload: Partial<TFleetManager>,
  user: AuthUser
) => {
  //   istFleetManagerExistsById
  const existingFleetManager = await FleetManager.findOne({ userId: id });
  if (!existingFleetManager) {
    throw new AppError(httpStatus.NOT_FOUND, 'Fleet Manager not found');
  }

  if (user?.id !== existingFleetManager?.userId) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'You are not authorize to update!'
    );
  }
  const updatedFleetManager = await FleetManager.findOneAndUpdate(
    { userId: existingFleetManager.userId },
    payload,
    { new: true }
  );
  return updatedFleetManager;
};

// fleet manager doc image upload service
const fleetManagerDocImageUpload = async (
  file: string | undefined,
  data: TFleetManagerImageDocuments,
  user: AuthUser,
  id: string
) => {
  const existingFleetManager = await FleetManager.findOne({ userId: id });
  if (!existingFleetManager) {
    throw new AppError(httpStatus.NOT_FOUND, 'Fleet Manager not found');
  }

  if (user?.id !== existingFleetManager?.userId) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'You are not authorize to upload document image!'
    );
  }

  if (data.docImageTitle && file) {
    existingFleetManager.documents = {
      ...existingFleetManager.documents,
      [data.docImageTitle]: file,
    };
    await existingFleetManager.save();
  }

  return {
    message: 'Image upload successfully',
    existingFleetManager,
  };
};

// fleet manager soft delete service
const fleetManagerSoftDelete = async (id: string) => {
  //   istFleetManagerExistsById
  const isFleetManagerExistsById = await FleetManager.findOne({ userId: id });

  if (!isFleetManagerExistsById) {
    throw new AppError(httpStatus.NOT_FOUND, 'Fleet Manager not found');
  }

  isFleetManagerExistsById.isDeleted = true;
  await isFleetManagerExistsById.save();

  return {
    message: 'Fleet Manager deleted successfully',
  };
};

// fleet manager permanent delete service
const fleetManagerPermanentDelete = async (userId: string) => {
  const isFleetManagerExistsById = await FleetManager.findOne({
    userId,
  });

  if (!isFleetManagerExistsById) {
    throw new AppError(httpStatus.NOT_FOUND, 'Fleet Manager not found');
  }

  await FleetManager.findOneAndDelete({ userId });

  return {
    message: 'Fleet Manager permanently deleted successfully',
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

  const result = await fleetManagers.modelQuery;
  return result;
};

// get single fleet manager
const getSingleFleetManagerFromDB = async (id: string) => {
  const existingFleetManager = await FleetManager.findOne({ userId: id });
  if (!existingFleetManager) {
    throw new AppError(httpStatus.NOT_FOUND, 'Fleet Manager not found!');
  }

  return existingFleetManager;
};

export const FleetManagerServices = {
  fleetManagerUpdate,
  fleetManagerDocImageUpload,
  fleetManagerSoftDelete,
  fleetManagerPermanentDelete,
  getAllFleetManagersFromDb,
  getSingleFleetManagerFromDB,
};
