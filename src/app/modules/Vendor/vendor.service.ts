import AppError from '../../errors/AppError';
import { User } from '../User/user.model';
import { TVendor } from './vendor.interface';
import httpStatus from 'http-status';
import { Vendor } from './vendor.model';
import mongoose from 'mongoose';

// Vendor Update Service
const vendorUpdate = async (id: string, payload: Partial<TVendor>) => {
  //   istVendorExistsById
  const isVendorExistsById = await User.findOne({ id, role: 'VENDOR' });
  if (!isVendorExistsById) {
    throw new AppError(httpStatus.NOT_FOUND, 'Vendor not found');
  }
  // Check if vendor email is verified
  if (isVendorExistsById.isEmailVerified === false) {
    throw new AppError(httpStatus.UNAUTHORIZED, 'Vendor email is not verified');
  }
  const finalData = {
    vendorId: isVendorExistsById.id,
    ...payload,
  };
  const updatedVendor = await Vendor.findOneAndUpdate(
    { vendorId: isVendorExistsById.id },
    finalData,
    { upsert: true, new: true }
  );
  return updatedVendor;
};

// vendor delete service
const vendorDelete = async (id: string) => {
  //   isUserExistsById
  const isUserExistsById = await User.findOne({ id, role: 'VENDOR' });
  if (!isUserExistsById) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }
  //   istVendorExistsById
  const isVendorExistsById = await Vendor.findOne({ vendorId: id });

  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    // delete user
    await User.deleteOne(
      { id: isUserExistsById?.id, role: 'VENDOR' },
      { session }
    );
    // delete vendor
    if (isVendorExistsById) {
      await Vendor.deleteOne(
        { vendorId: isVendorExistsById?.vendorId },
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
    message: 'Vendor deleted successfully',
  };
};

export const VendorServices = { vendorUpdate, vendorDelete };
