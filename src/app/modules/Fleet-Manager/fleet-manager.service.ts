/* eslint-disable @typescript-eslint/no-explicit-any */
import AppError from '../../errors/AppError';
import httpStatus from 'http-status';
import mongoose from 'mongoose';
import { User } from '../Customer/customer.model';
import { AuthUser } from '../../constant/user.const';
import { EmailHelper } from '../../utils/emailSender';
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
  const existingFleetManager = await FleetManager.findOne({ agentId: id });
  if (!existingFleetManager) {
    throw new AppError(httpStatus.NOT_FOUND, 'Fleet Manager not found');
  }

  if (user?.id !== existingFleetManager?.agentId) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'You are not authorize to update!'
    );
  }
  const updatedFleetManager = await FleetManager.findOneAndUpdate(
    { agentId: existingFleetManager.agentId },
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
  const existingFleetManager = await FleetManager.findOne({ agentId: id });
  if (!existingFleetManager) {
    throw new AppError(httpStatus.NOT_FOUND, 'Fleet Manager not found');
  }

  if (user?.id !== existingFleetManager?.agentId) {
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

// submit fleet manager for approval service
const submitFleetManagerForApproval = async (id: string, user: AuthUser) => {
  //   istFleetManagerExistsById
  const existingFleetManager = await FleetManager.findOne({ agentId: id });
  if (!existingFleetManager) {
    throw new AppError(httpStatus.NOT_FOUND, 'Fleet Manager not found');
  }

  existingFleetManager.status = 'PENDING';
  await existingFleetManager.save();

  // Prepare & send email to admin for fleet manager approval
  const emailHtml = await EmailHelper.createEmailContent(
    {
      vendorName: existingFleetManager.companyDetails?.companyName,
      vendorId: existingFleetManager.agentId,
      currentYear: new Date().getFullYear(),
    },
    'agent-submission-notification'
  );

  await EmailHelper.sendEmail(
    user?.email,
    emailHtml,
    'New Vendor Submission for Approval'
  );

  return {
    message: 'Agent submitted for approval',
    existingFleetManager,
  };
};

// fleet manager delete service
const fleetManagerDelete = async (id: string) => {
  //   isUserExistsById
  const isUserExistsById = await User.findOne({ id, role: 'FLEET_MANAGER' });
  if (!isUserExistsById) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }
  //   istFleetManagerExistsById
  const isFleetManagerExistsById = await FleetManager.findOne({ agentId: id });

  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    // delete user
    await User.deleteOne(
      { id: isUserExistsById?.id, role: 'VENDOR' },
      { session }
    );
    // delete fleet manager
    if (isFleetManagerExistsById) {
      await FleetManager.deleteOne(
        { agentId: isFleetManagerExistsById?.agentId },
        { session }
      );
    }

    await session.commitTransaction();
    session.endSession();
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }

  return {
    message: 'Fleet Manager deleted successfully',
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
  const existingFleetManager = await FleetManager.findOne({ agentId: id });
  if (!existingFleetManager) {
    throw new AppError(httpStatus.NOT_FOUND, 'Fleet Manager not found!');
  }

  return existingFleetManager;
};

export const FleetManagerServices = {
  fleetManagerUpdate,
  fleetManagerDocImageUpload,
  submitFleetManagerForApproval,
  fleetManagerDelete,
  getAllFleetManagersFromDb,
  getSingleFleetManagerFromDB,
};
