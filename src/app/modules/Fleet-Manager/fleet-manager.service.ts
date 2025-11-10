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
  currentUser: AuthUser,
  profilePhoto: string | undefined
) => {
  //   istFleetManagerExistsById
  const existingFleetManager = await FleetManager.findOne({ userId: id });
  if (!existingFleetManager) {
    throw new AppError(httpStatus.NOT_FOUND, 'Fleet Manager not found');
  }

  if (currentUser?.id !== existingFleetManager?.userId) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'You are not authorize to update!'
    );
  }

  if (payload.profilePhoto) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Profile photo should be in file!'
    );
  }
  if (profilePhoto) {
    payload.profilePhoto = profilePhoto;
  }

  const updatedFleetManager = await FleetManager.findOneAndUpdate(
    { userId: existingFleetManager.userId },
    { ...payload },
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
  getAllFleetManagersFromDb,
  getSingleFleetManagerFromDB,
};
