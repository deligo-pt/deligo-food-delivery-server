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
import { getPopulateOptions } from '../../utils/getPopulateOptions';
import { TLiveLocationPayload } from '../../constant/GlobalInterface/global.interface';

// Vendor Update Service
const vendorUpdate = async (
  id: string,
  payload: Partial<TVendor>,
  currentUser: AuthUser,
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
      'Vendor update is locked. Please contact support.',
    );
  }

  // -----------------------------------------
  // Authorization check
  // -----------------------------------------
  if (currentUser.userId !== existingVendor.userId) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'You are not authorized to update this vendor.',
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
    { new: true },
  );

  if (!updatedVendor) {
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Failed to update vendor.',
    );
  }

  return updatedVendor;
};

// vendor doc image upload service
const vendorDocImageUpload = async (
  file: string | undefined,
  data: TVendorImageDocuments,
  currentUser: AuthUser,
  vendorId: string,
) => {
  const existingVendor = await Vendor.findOne({ userId: vendorId });
  if (!existingVendor) {
    throw new AppError(httpStatus.NOT_FOUND, 'Vendor not found');
  }

  if (existingVendor?.isUpdateLocked) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Vendor update is locked. Please contact support.',
    );
  }

  if (currentUser?.userId !== existingVendor?.userId) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'You are not authorize to upload document image!',
    );
  }

  // delete previous image if exists
  const docTitle = data?.docImageTitle;

  if (docTitle && existingVendor.documents?.[docTitle]) {
    const oldImage = existingVendor.documents[docTitle];
    deleteSingleImageFromCloudinary(oldImage).catch((err) => {
      console.log(err);
      // throw new AppError(httpStatus.BAD_REQUEST, err.message);
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

const updateVendorLiveLocation = async (
  payload: TLiveLocationPayload,
  currentUser: AuthUser,
  vendorId: string,
) => {
  if (currentUser?.status !== 'APPROVED') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      `You are not approved to update live location. Your account status is: ${currentUser?.status}`,
    );
  }

  if (currentUser?.userId !== vendorId) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'You are not authorize to update live location!',
    );
  }

  const {
    latitude,
    longitude,
    geoAccuracy,
    heading,
    speed,
    isMocked,
    timestamp,
  } = payload;

  if (geoAccuracy !== undefined && geoAccuracy > 100) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Geo accuracy should be less than 100',
    );
  }

  const updateData: Record<string, any> = {
    'currentSessionLocation.type': 'Point',
    'currentSessionLocation.coordinates': [longitude, latitude],
    'currentSessionLocation.lastLocationUpdate': timestamp
      ? new Date(timestamp)
      : new Date(),
    'businessLocation.longitude': longitude,
    'businessLocation.latitude': latitude,
  };

  if (geoAccuracy !== undefined)
    updateData['currentSessionLocation.geoAccuracy'] = geoAccuracy;
  if (heading !== undefined)
    updateData['currentSessionLocation.heading'] = heading;
  if (speed !== undefined) updateData['currentSessionLocation.speed'] = speed;
  if (isMocked !== undefined)
    updateData['currentSessionLocation.isMocked'] = isMocked;

  const updatedVendor = await Vendor.findOneAndUpdate(
    { userId: currentUser.userId },
    { $set: updateData },
    {
      new: true,
      runValidators: true,
    },
  );

  if (!updatedVendor) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      'Vendor not found or update failed.',
    );
  }

  return {
    success: true,
    message: 'Live location updated successfully',
    data: updatedVendor.currentSessionLocation,
  };
};

// toggle vendor store open/close service
const toggleVendorStoreOpenClose = async (currentUser: AuthUser) => {
  if (currentUser?.status !== 'APPROVED') {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `You are not approved to toggle store open/close. Your account is ${currentUser?.status}`,
    );
  }

  currentUser.businessDetails!.isStoreOpen =
    !currentUser.businessDetails?.isStoreOpen;
  currentUser.businessDetails!.storeClosedAt = new Date();
  await (currentUser as any).save();
  return {
    message: `Store is ${
      currentUser?.businessDetails?.isStoreOpen ? 'open' : 'closed'
    }`,
  };
};

// get all vendors
const getAllVendors = async (
  query: Record<string, unknown>,
  currentUser: AuthUser,
) => {
  if (currentUser?.status !== 'APPROVED') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      `You are not approved to view vendors. Your account is ${currentUser?.status}`,
    );
  }
  const vendors = new QueryBuilder(Vendor.find(), query)
    .fields()
    .paginate()
    .sort()
    .filter()
    .search(VendorSearchableFields);

  const populateOptions = getPopulateOptions(currentUser.role, {
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
  currentUser: AuthUser,
) => {
  if (currentUser.role === 'VENDOR' && currentUser.userId !== vendorId) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'You are not authorize to access this vendor!',
    );
  }

  let query: any;
  if (currentUser.role === 'VENDOR') {
    query = Vendor.findOne({
      userId: currentUser.userId,
      isDeleted: false,
    });
  } else {
    query = Vendor.findOne({
      userId: vendorId,
    });
  }

  const populateOptions = getPopulateOptions(currentUser.role, {
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
  updateVendorLiveLocation,
  toggleVendorStoreOpenClose,
  getAllVendors,
  getSingleVendorFromDB,
};
