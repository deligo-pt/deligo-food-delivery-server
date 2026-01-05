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
import { getPopulateOptions } from '../../utils/getPopulateOptions';

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
  // Derive GeoJSON from latitude/longitude
  // -----------------------------------------
  if (payload.businessLocation) {
    const { longitude, latitude } = payload.businessLocation;

    const hasLng = typeof longitude === 'number';
    const hasLat = typeof latitude === 'number';

    if (hasLng && hasLat) {
      payload.currentSessionLocation = {
        type: 'Point',
        coordinates: [longitude, latitude],
        lastLocationUpdate: new Date(),
      };
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
    data: existingVendor.documents,
  };
};

// vendor business location update service
const vendorBusinessLocationUpdate = async (
  payload: Partial<TVendor>,
  currentUser: AuthUser
) => {
  const existingVendor = await Vendor.findOne({
    userId: currentUser.id,
    isDeleted: false,
  });
  if (!existingVendor) {
    throw new AppError(httpStatus.NOT_FOUND, 'Vendor not found');
  }

  if (existingVendor?.status !== 'APPROVED') {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `You are not approved to update business location. Your account is ${existingVendor?.status}`
    );
  }

  if (currentUser?.id !== existingVendor?.userId) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'You are not authorize to update business location!'
    );
  }

  // -----------------------------------------
  // Derive GeoJSON from latitude/longitude
  // -----------------------------------------
  if (payload.businessLocation) {
    const { longitude, latitude } = payload.businessLocation;

    const hasLng = typeof longitude === 'number';
    const hasLat = typeof latitude === 'number';

    if (hasLng && hasLat) {
      payload.currentSessionLocation = {
        type: 'Point',
        coordinates: [longitude, latitude],
        lastLocationUpdate: new Date(),
      };
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
  return {
    message: 'Vendor business location updated successfully',
    data: updatedVendor.businessLocation,
  };
};

// toggle vendor store open/close service
const toggleVendorStoreOpenClose = async (currentUser: AuthUser) => {
  const existingVendor = await Vendor.findOne({
    userId: currentUser.id,
    isDeleted: false,
  });
  if (!existingVendor) {
    throw new AppError(httpStatus.NOT_FOUND, 'Vendor not found');
  }
  if (existingVendor?.status !== 'APPROVED') {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `You are not approved to toggle store open/close. Your account is ${existingVendor?.status}`
    );
  }

  existingVendor.businessDetails!.isStoreOpen =
    !existingVendor?.businessDetails?.isStoreOpen;
  existingVendor.businessDetails!.storeClosedAt = new Date();
  await existingVendor.save();
  return {
    message: `Store is ${
      existingVendor?.businessDetails?.isStoreOpen ? 'open' : 'closed'
    }`,
  };
};

// get all vendors
const getAllVendors = async (
  query: Record<string, unknown>,
  currentUser: AuthUser
) => {
  const result = await findUserByEmailOrId({
    userId: currentUser.id,
    isDeleted: false,
  });
  const loggedInUser = result?.user;
  if (loggedInUser?.status !== 'APPROVED') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      `You are not approved to view vendors. Your account is ${loggedInUser?.status}`
    );
  }
  const vendors = new QueryBuilder(Vendor.find(), query)
    .fields()
    .paginate()
    .sort()
    .filter()
    .search(VendorSearchableFields);

  const populateOptions = getPopulateOptions(loggedInUser.role, {
    approvedBy: 'name userId role',
    rejectedBy: 'name userId role',
    blockedBy: 'name userId role',
  });

  populateOptions.forEach((option) => {
    vendors.modelQuery = vendors.modelQuery.populate(option);
  });

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
  const loggedInUser = result.user;
  if (loggedInUser.role === 'VENDOR' && loggedInUser.userId !== vendorId) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'You are not authorize to access this vendor!'
    );
  }

  let query: any;
  if (loggedInUser.role === 'VENDOR') {
    query = Vendor.findOne({
      userId: loggedInUser.userId,
      isDeleted: false,
    });
  } else {
    query = Vendor.findOne({
      userId: vendorId,
    });
  }

  const populateOptions = getPopulateOptions(loggedInUser.role, {
    approvedBy: 'name userId role',
    rejectedBy: 'name userId role',
    blockedBy: 'name userId role',
  });

  populateOptions.forEach((option) => {
    query = query.populate(option);
  });

  const existingVendor = await query;
  if (!existingVendor) {
    throw new AppError(httpStatus.NOT_FOUND, 'Vendor not found!');
  }

  return existingVendor;
};

export const VendorServices = {
  vendorUpdate,
  vendorDocImageUpload,
  vendorBusinessLocationUpdate,
  toggleVendorStoreOpenClose,
  getAllVendors,
  getSingleVendorFromDB,
};
