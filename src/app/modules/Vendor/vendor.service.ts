/* eslint-disable @typescript-eslint/no-explicit-any */
import AppError from '../../errors/AppError';
import { TVendor, TVendorImageDocuments } from './vendor.interface';
import httpStatus from 'http-status';
import { Vendor } from './vendor.model';
import { AuthUser } from '../../constant/user.const';
import { QueryBuilder } from '../../builder/QueryBuilder';
import { VendorSearchableFields } from './vendor.constant';
import { deleteSingleImageFromCloudinary } from '../../utils/deleteImage';

// Vendor Update Service
const vendorUpdate = async (
  id: string,
  payload: Partial<TVendor>,
  currentUser: AuthUser
) => {
  //   istVendorExistsById
  const existingVendor = await Vendor.findOne({ userId: id });
  if (!existingVendor) {
    throw new AppError(httpStatus.NOT_FOUND, 'Vendor not found');
  }

  if (currentUser?.id !== existingVendor?.userId) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'You are not authorize to update!'
    );
  }

  const updatedVendor = await Vendor.findOneAndUpdate(
    { userId: existingVendor.userId },
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
  const existingVendor = await Vendor.findOne({ userId: id });
  if (!existingVendor) {
    throw new AppError(httpStatus.NOT_FOUND, 'Vendor not found');
  }

  if (user?.id !== existingVendor?.userId) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'You are not authorize to upload document image!'
    );
  }

  // delete previous image if exists
  const docTitle = data?.docImageTitle;

  if (docTitle && existingVendor?.documents?.[docTitle]) {
    try {
      const oldImage = existingVendor?.documents?.[docTitle];
      await deleteSingleImageFromCloudinary(oldImage);
    } catch (error) {
      throw new AppError(
        httpStatus.INTERNAL_SERVER_ERROR,
        'Failed to delete previous document image!'
      );
    }
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
  if (currentUser.role === 'VENDOR' && currentUser.id !== vendorId) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'You are not authorize to access this vendor!'
    );
  }
  const existingVendor = await Vendor.findOne({ userId: vendorId });
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
