/* eslint-disable @typescript-eslint/no-explicit-any */
import AppError from '../../errors/AppError';
import { TVendor, TVendorImageDocuments } from './vendor.interface';
import httpStatus from 'http-status';
import { Vendor } from './vendor.model';
import mongoose from 'mongoose';
import { User } from '../User/user.model';
import { AuthUser } from '../../constant/user.const';
import { EmailHelper } from '../../utils/emailSender';
import { QueryBuilder } from '../../builder/QueryBuilder';
import { VendorSearchableFields } from './vendor.constant';

// Vendor Update Service
const vendorUpdate = async (
  id: string,
  payload: Partial<TVendor>,
  user: AuthUser
) => {
  //   istVendorExistsById
  const existingVendor = await Vendor.findOne({ vendorId: id });
  if (!existingVendor) {
    throw new AppError(httpStatus.NOT_FOUND, 'Vendor not found');
  }

  if (user?.id !== existingVendor?.vendorId) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'You are not authorize to update!'
    );
  }
  const updatedVendor = await Vendor.findOneAndUpdate(
    { vendorId: existingVendor.vendorId },
    payload,
    { new: true }
  );
  return updatedVendor;
};

// vendor doc image upload service
const vendorDocImageUpload = async (
  file: string | undefined,
  data: TVendorImageDocuments,
  user: AuthUser,
  id: string
) => {
  const existingVendor = await Vendor.findOne({ vendorId: id });
  if (!existingVendor) {
    throw new AppError(httpStatus.NOT_FOUND, 'Vendor not found');
  }

  if (user?.id !== existingVendor?.vendorId) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'You are not authorize to upload document image!'
    );
  }

  if (data.docImageTitle && file) {
    existingVendor.documents = {
      ...existingVendor.documents,
      [data.docImageTitle]: file,
    };
    await existingVendor.save();
  }

  return {
    message: 'Image upload successfully',
    existingVendor,
  };
};

// submit vendor for approval service
const submitVendorForApproval = async (id: string, user: AuthUser) => {
  //   istVendorExistsById
  const existingVendor = await Vendor.findOne({ vendorId: id });
  if (!existingVendor) {
    throw new AppError(httpStatus.NOT_FOUND, 'Vendor not found');
  }

  existingVendor.status = 'PENDING';
  await existingVendor.save();

  // Prepare & send email to admin for vendor approval
  const emailHtml = await EmailHelper.createEmailContent(
    {
      vendorName: existingVendor.businessDetails?.businessName,
      vendorId: existingVendor.vendorId,
      currentYear: new Date().getFullYear(),
    },
    'vendor-submission-notification'
  );

  await EmailHelper.sendEmail(
    user?.email,
    emailHtml,
    'New Vendor Submission for Approval'
  );

  return {
    message: 'Vendor submitted for approval',
    existingVendor,
  };
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

// get all vendors
const getAllVendors = async (query: Record<string, unknown>) => {
  const vendors = new QueryBuilder(Vendor.find(), query)
    .fields()
    .paginate()
    .sort()
    .filter()
    .search(VendorSearchableFields);

  const result = await vendors.modelQuery;
  return result;
};

// get single vendor
const getSingleVendorFromDB = async (id: string) => {
  const existingVendor = await Vendor.findOne({ vendorId: id });
  if (!existingVendor) {
    throw new AppError(httpStatus.NOT_FOUND, 'Vendor not found!');
  }

  return existingVendor;
};

export const VendorServices = {
  vendorUpdate,
  vendorDocImageUpload,
  submitVendorForApproval,
  vendorDelete,
  getAllVendors,
  getSingleVendorFromDB,
};
