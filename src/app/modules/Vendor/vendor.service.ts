/* eslint-disable @typescript-eslint/no-explicit-any */
import AppError from '../../errors/AppError';
import { TVendor, TVendorImageDocuments } from './vendor.interface';
import httpStatus from 'http-status';
import { Vendor } from './vendor.model';
import { AuthUser } from '../../constant/user.constant';
import { QueryBuilder } from '../../builder/QueryBuilder';
import { VendorSearchableFields } from './vendor.constant';
import { deleteSingleImageFromCloudinary } from '../../utils/deleteImage';
import { BusinessCategory } from '../Category/category.model';
import { findUserByEmailOrId } from '../../utils/findUserByEmailOrId';

// Vendor Update Service
const vendorUpdate = async (
  id: string,
  payload: Partial<TVendor>,
  currentUser: AuthUser
) => {
  // -----------------------------------------
  // Check if vendor exists
  // -----------------------------------------
  const existingVendor = await Vendor.findOne({ userId: id });

  if (!existingVendor) {
    throw new AppError(httpStatus.NOT_FOUND, 'Vendor not found.');
  }

  // -----------------------------------------
  // Check if vendor is locked for update
  // -----------------------------------------
  if (existingVendor.isUpdateLocked) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Vendor update is locked. Please contact support.'
    );
  }

  // -----------------------------------------
  // Authorization check
  // -----------------------------------------
  if (currentUser.id !== existingVendor.userId) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'You are not authorized to update this vendor.'
    );
  }

  // -----------------------------------------
  // Validate business type if provided
  // -----------------------------------------
  if (payload.businessDetails?.businessType) {
    const exists = await BusinessCategory.findOne({
      name: payload.businessDetails.businessType,
    });

    if (!exists) {
      throw new AppError(httpStatus.BAD_REQUEST, 'Invalid business type.');
    }
  }

  // -----------------------------------------
  // Update vendor
  // -----------------------------------------
  const updatedVendor = await Vendor.findOneAndUpdate(
    { userId: existingVendor.userId },
    { $set: payload },
    { new: true }
  );

  if (!updatedVendor) {
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Failed to update vendor.'
    );
  }

  return updatedVendor;
};

// vendor doc image upload service
const vendorDocImageUpload = async (
  file: string | undefined,
  data: TVendorImageDocuments,
  currentUser: AuthUser,
  vendorId: string
) => {
  const existingVendor = await Vendor.findOne({ userId: vendorId });
  if (!existingVendor) {
    throw new AppError(httpStatus.NOT_FOUND, 'Vendor not found');
  }

  if (existingVendor?.isUpdateLocked) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Vendor update is locked. Please contact support.'
    );
  }

  if (currentUser?.id !== existingVendor?.userId) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'You are not authorize to upload document image!'
    );
  }

  // delete previous image if exists
  const docTitle = data?.docImageTitle;

  if (docTitle && existingVendor.documents?.[docTitle]) {
    const oldImage = existingVendor.documents[docTitle];
    deleteSingleImageFromCloudinary(oldImage).catch((err) => {
      throw new AppError(httpStatus.BAD_REQUEST, err.message);
    });
  }

  if (data.docImageTitle && file) {
    existingVendor.documents = {
      ...existingVendor.documents,
      [data.docImageTitle]: file,
    };
    await existingVendor.save();
  }

  return {
    message: 'Vendor document image updated successfully',
    existingVendor,
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
  const meta = await vendors.countTotal();
  const data = await vendors.modelQuery;
  return {
    meta,
    data,
  };
};

// get single vendor
const getSingleVendorFromDB = async (
  vendorId: string,
  currentUser: AuthUser
) => {
  const result = await findUserByEmailOrId({
    userId: currentUser.id,
    isDeleted: false,
  });
  const user = result.user;
  if (user.role === 'VENDOR' && user.id !== vendorId) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'You are not authorize to access this vendor!'
    );
  }

  let existingVendor;
  if (user.role === 'VENDOR') {
    existingVendor = await Vendor.findOne({
      userId: user.userId,
      isDeleted: false,
    });
  } else {
    existingVendor = await Vendor.findOne({
      userId: vendorId,
    });
  }
  if (!existingVendor) {
    throw new AppError(httpStatus.NOT_FOUND, 'Vendor not found!');
  }

  return existingVendor;
};

export const VendorServices = {
  vendorUpdate,
  vendorDocImageUpload,
  getAllVendors,
  getSingleVendorFromDB,
};
