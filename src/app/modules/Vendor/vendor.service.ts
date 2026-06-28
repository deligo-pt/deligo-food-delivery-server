/* eslint-disable @typescript-eslint/no-explicit-any */
import AppError from '../../errors/AppError';
import { TVendor, TVendorImageDocuments } from './vendor.interface';
import httpStatus from 'http-status';
import { Vendor } from './vendor.model';
import { QueryBuilder } from '../../builder/QueryBuilder';
import { VendorSearchableFields } from './vendor.constant';
import {
  BusinessCategory,
  Cuisine,
  ProductCategory,
} from '../Category/category.model';
import { getPopulateOptions } from '../../utils/getPopulateOptions';
import { flattenObject } from '../../utils/flattenObject';
import { Product } from '../Product/product.model';
import { GlobalSettingsService } from '../GlobalSetting/globalSetting.service';
import { deleteSingleImageFromCloudinary } from '../../utils/deleteImage';
import { TLiveLocationPayload } from '../../constant/GlobalInterface/location.interface';
import { TCurrentUser } from '../../constant/GlobalInterface/user.interface';
import { BusinessCategoryName } from '../Category/category.interface';
import { Customer } from '../Customer/customer.model';
import { Types } from 'mongoose';

/**
 * Service to update vendor profile information.
 * Handles authorization, update-locking logic, business category validation,
 * GeoJSON location derivation, and safe nested updates using flattening.
 */
const vendorUpdate = async (
  id: string,
  payload: Partial<TVendor>,
  currentUser: TCurrentUser,
) => {
  // 1. Initial check to ensure the vendor exists in the system
  const existingVendor = await Vendor.findOne({ userId: id });

  if (!existingVendor) {
    throw new AppError(httpStatus.NOT_FOUND, 'Vendor not found.');
  }

  // 2. Define access control: Admins/Super Admins or the Account Owner (Vendor/Sub-Vendor)
  const isStaff = ['ADMIN', 'SUPER_ADMIN'].includes(currentUser.role);
  const isOwner =
    (currentUser.role === 'VENDOR' || currentUser.role === 'SUB_VENDOR') &&
    currentUser.userId === existingVendor.userId;

  // 3. Authorization: Block unauthorized users from modifying the vendor profile
  if (!isStaff && !isOwner) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'You are not authorized for this action.',
    );
  }

  // 4. Update-Lock: Prevent changes if the profile is locked, unless bypassed by an Admin
  if (existingVendor.isUpdateLocked && !isStaff) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Vendor update is locked. Please contact support.',
    );
  }

  const businessType = payload.businessDetails?.businessType;
  const cuisineType = payload.businessDetails?.restaurantCuisineType;

  // 5. Business Validation: Verify that the provided business type exists in the database
  if (businessType) {
    const exists = await BusinessCategory.findOne({
      name: businessType,
    });

    if (!exists) {
      throw new AppError(httpStatus.BAD_REQUEST, 'Invalid business type.');
    }

    if (businessType === BusinessCategoryName.RESTAURANT && !cuisineType) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'Please select a cuisine type.',
      );
    }

    if (
      businessType === BusinessCategoryName.RESTAURANT &&
      cuisineType &&
      !Array.isArray(cuisineType)
    ) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'Please select at least one cuisine type.',
      );
    }

    if (cuisineType && cuisineType.length > 0) {
      const cuisineTypeExists = await Cuisine.find({
        'name.en': { $in: cuisineType },
      });
      if (cuisineTypeExists.length !== cuisineType.length) {
        throw new AppError(httpStatus.BAD_REQUEST, 'Invalid cuisine type.');
      }
    }
  }

  // 6. Geospatial Data: Generate GeoJSON Point if latitude and longitude are provided
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

  // 7. Data Safety: Flatten the payload to prevent accidental overwriting of nested objects in MongoDB
  const flattenedPayload = flattenObject(payload);

  // 8. Execution: Perform the update using findOneAndUpdate with the atomic $set operator
  const updatedVendor = await Vendor.findOneAndUpdate(
    { userId: existingVendor.userId },
    { $set: flattenedPayload },
    { new: true, runValidators: true }, // Ensure new data adheres to schema rules
  );

  if (!updatedVendor) {
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Failed to update vendor.',
    );
  }

  return {
    message: 'Vendor updated successfully',
    data: updatedVendor,
  };
};

/**
 * Service to upload or update vendor document images (businessLicenseDoc, taxDoc, Store Photo, etc.)
 * Handles old image cleanup, authorization, and update-lock bypass for admins.
 */
const vendorDocImageUpload = async (
  payload: TVendorImageDocuments,
  currentUser: TCurrentUser,
  vendorId: string,
) => {
  // 1. Check if the vendor exists in the database
  const existingVendor = await Vendor.findOne({ userId: vendorId });
  if (!existingVendor) {
    throw new AppError(httpStatus.NOT_FOUND, 'Vendor not found');
  }

  const { docImageTitle, docImageUrls } = payload;

  // 2. Define user roles and access rights
  const isStaff = ['ADMIN', 'SUPER_ADMIN'].includes(currentUser.role);
  const isOwner =
    (currentUser.role === 'VENDOR' || currentUser.role === 'SUB_VENDOR') &&
    currentUser.userId === existingVendor.userId;

  // 3. Authorization: Only Admins or the Account Owner can perform this action
  if (!isStaff && !isOwner) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'You are not authorized for this action.',
    );
  }

  // 4. Protection: Block updates if the profile is locked (Admins can bypass this lock)
  if (existingVendor.isUpdateLocked && !isStaff) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Vendor update is locked. Please contact support.',
    );
  }

  // 6. Update: Set the new file path to the specific document field
  if (docImageTitle && docImageUrls.length > 0) {
    const previousImages =
      existingVendor.documents?.[
        docImageTitle as keyof typeof existingVendor.documents
      ] || [];

    const allImages = [...previousImages, ...docImageUrls];
    const uniqueImages = [...new Set(allImages)];
    if (uniqueImages.length > 3) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        `Maximum 3 images are allowed for ${payload.docImageTitle}. You already have ${previousImages.length} and trying to add ${docImageUrls.length}.`,
      );
    }
    // Spread existing documents to prevent accidental data loss
    existingVendor.documents = {
      ...existingVendor.documents,
      [docImageTitle]: uniqueImages,
    } as any;

    // Explicitly tell Mongoose that the nested 'documents' object has changed
    existingVendor.markModified('documents');

    if (docImageTitle === 'myPhoto') {
      existingVendor.profilePhoto = uniqueImages[0];
    }
    await existingVendor.save();
  }

  return {
    message: 'Vendor document image updated successfully',
    data: existingVendor.documents,
  };
};

// Service to delete a specific document image from a vendor's profile
const deleteVendorDocument = async (
  payload: { docImageTitle: string; imageUrl: string },
  currentUser: TCurrentUser,
  vendorId: string,
) => {
  const { docImageTitle, imageUrl } = payload;
  const existingVendor = await Vendor.findOne({ userId: vendorId });
  if (!existingVendor)
    throw new AppError(httpStatus.NOT_FOUND, 'Vendor not found');

  const isStaff = ['ADMIN', 'SUPER_ADMIN'].includes(currentUser.role);
  const isOwner = currentUser.userId === existingVendor.userId;
  if (!isStaff && !isOwner)
    throw new AppError(
      httpStatus.FORBIDDEN,
      'You are not authorized for this action.',
    );

  if (existingVendor.isUpdateLocked && !isStaff) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Profile is locked. Contact support.',
    );
  }

  const docArray = (existingVendor.documents as any)[docImageTitle];
  if (!Array.isArray(docArray) || !docArray.includes(imageUrl)) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      'Image not found in this document category',
    );
  }

  await deleteSingleImageFromCloudinary(imageUrl).catch((err) => {
    console.error('Cloudinary deletion failed:', err);
  });

  existingVendor.documents = {
    ...existingVendor.documents,
    [docImageTitle]: docArray.filter((url: string) => url !== imageUrl),
  } as any;

  existingVendor.markModified('documents');
  if (docImageTitle === 'myPhoto' && existingVendor.profilePhoto === imageUrl) {
    existingVendor.profilePhoto = '';
  }
  await existingVendor.save();

  return {
    message: 'Vendor document image deleted successfully',
    data: existingVendor.documents,
  };
};

// vendor business location update service
const updateVendorLiveLocation = async (
  payload: TLiveLocationPayload,
  currentUser: TCurrentUser,
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
    // 'businessLocation.longitude': longitude,
    // 'businessLocation.latitude': latitude,
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
const toggleVendorStoreOpenClose = async (currentUser: TCurrentUser) => {
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
    data: null,
  };
};

// get all vendors
const getAllVendors = async (
  query: Record<string, unknown>,
  currentUser: TCurrentUser,
) => {
  if (currentUser?.status !== 'APPROVED') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      `You are not approved to view vendors. Your account is ${currentUser?.status}`,
    );
  }
  const vendors = new QueryBuilder(Vendor.find(), query)
    .search(VendorSearchableFields)
    .filter()
    .sort()
    .paginate()
    .fields();

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
    message: 'Vendors Retrieved Successfully',
    meta,
    data,
  };
};

// get single vendor
const getSingleVendor = async (vendorId: string, currentUser: TCurrentUser) => {
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

  return {
    message: 'Vendor Retrieved Successfully',
    data: existingVendor,
  };
};

// get all vendors for customer
const getAllVendorsForCustomer = async (
  query: Record<string, unknown>,
  currentUser: TCurrentUser,
) => {
  const customerProfile = await Customer.findOne({
    userId: currentUser.userId,
    isDeleted: false,
  }).lean();

  if (!customerProfile) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      'Customer profile not found. Please set up your profile first.',
    );
  }

  let lng: number | undefined;
  let lat: number | undefined;
  const activeAddress = customerProfile.deliveryAddresses?.find(
    (addr: any) => addr.isActive === true,
  );

  if (
    activeAddress &&
    activeAddress.longitude != null &&
    activeAddress.latitude != null
  ) {
    lng = activeAddress.longitude;
    lat = activeAddress.latitude;
  } else if (
    customerProfile.currentSessionLocation?.coordinates &&
    customerProfile.currentSessionLocation.coordinates.length >= 2
  ) {
    [lng, lat] = customerProfile.currentSessionLocation.coordinates;
  }

  if (lng == null || lat == null) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Location required. Please select a delivery address or enable GPS to find nearby restaurants.',
    );
  }

  const globalSettings = await GlobalSettingsService.getGlobalSettings();
  const radiusInKm = globalSettings.customerNearestVendorRadiusKm;

  const activeProductVendorIds = await Product.distinct('vendorId', {
    isDeleted: false,
  });

  const filter: any = {
    _id: { $in: activeProductVendorIds },
    status: 'APPROVED',
    isDeleted: false,
    currentSessionLocation: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [lng, lat],
        },
        $maxDistance: radiusInKm * 1000,
      },
    },
  };

  if (query.restaurantCuisineType) {
    const cuisineInput = query.restaurantCuisineType as string;

    filter['businessDetails.restaurantCuisineType'] = {
      $regex: new RegExp(`^${cuisineInput.trim()}$`, 'i'),
    };
    delete query.restaurantCuisineType;
  }

  if (query.productCategory) {
    const categoryObjectId = new Types.ObjectId(
      query.productCategory as string,
    );

    const matchingVendorIds = await Product.distinct('vendorId', {
      category: categoryObjectId,
      isDeleted: false,
      vendorId: { $in: activeProductVendorIds },
    });

    if (matchingVendorIds.length === 0) {
      return {
        message: 'Vendors Retrieved Successfully',
        meta: {
          total: 0,
          page: 1,
          limit: Number(query.limit) || 10,
          totalPage: 0,
        },
        data: [],
      };
    }

    const activeVendorStrSet = new Set(
      activeProductVendorIds.map((id) => id.toString()),
    );

    const finalMatchingIds = matchingVendorIds
      .filter((id) => activeVendorStrSet.has(id.toString()))
      .map((id) => new Types.ObjectId(id.toString()));
    filter._id = { $in: finalMatchingIds };
    delete query.productCategory;
  }

  // 4. QueryBuilder Execution
  const vendors = new QueryBuilder(Vendor.find(filter), query)
    .search(['businessDetails.businessName'])
    .filter();

  if (query.sort) {
    vendors.sort();
  }
  vendors.paginate().fields();

  vendors.modelQuery = vendors.modelQuery.select(
    'name userId businessDetails businessLocation documents rating currentSessionLocation',
  );

  const meta = await vendors.countTotal();
  const rawData = await vendors.modelQuery;

  const vendorIds = rawData.map((v: any) => v._id);

  const allActiveProducts = await Product.find({
    vendorId: { $in: vendorIds },
    isDeleted: false,
  })
    .select('vendorId category')
    .lean();

  const allCategoryIds = [
    ...new Set(allActiveProducts.map((p) => p.category?.toString())),
  ].filter(Boolean);

  const allCategories = await ProductCategory.find({
    _id: { $in: allCategoryIds },
  })
    .select('name icon')
    .lean();

  const data = rawData.map((vendor: any) => {
    const thisVendorProducts = allActiveProducts.filter(
      (p) => p.vendorId?.toString() === vendor._id.toString(),
    );

    const thisVendorCategoryIds = [
      ...new Set(thisVendorProducts.map((p) => p.category?.toString())),
    ];

    const populatedCategories = allCategories.filter((cat) =>
      thisVendorCategoryIds.includes(cat._id.toString()),
    );

    return {
      id: vendor._id,
      userId: vendor.userId,
      name: vendor.name,
      businessDetails: {
        businessName: vendor.businessDetails?.businessName,
        businessType: vendor.businessDetails?.businessType,
        restaurantCuisineType: vendor.businessDetails?.restaurantCuisineType,
        openingHours: vendor.businessDetails?.openingHours,
        closingHours: vendor.businessDetails?.closingHours,
        closingDays: vendor.businessDetails?.closingDays,
        isStoreOpen: vendor.businessDetails?.isStoreOpen,
      },
      businessLocation: vendor.businessLocation,
      storePhoto: vendor.documents?.storePhoto || '',
      rating: vendor.rating,
      currentSessionLocation: vendor.currentSessionLocation,
      availableCategories: populatedCategories,
    };
  });

  return {
    message: 'Vendors Retrieved Successfully',
    meta,
    data,
  };
};

// get single vendor for customer
const getSingleVendorForCustomer = async (vendorId: string) => {
  const existingVendor = await Vendor.findOne({
    userId: vendorId,
    isDeleted: false,
  }).select('name userId email contactNumber businessDetails businessLocation');
  if (!existingVendor) {
    throw new AppError(httpStatus.NOT_FOUND, 'Vendor not found!');
  }

  return {
    message: 'Vendor Retrieved Successfully',
    data: existingVendor,
  };
};

const getAllVendorsForCustomerPublic = async (
  query: Record<string, unknown>,
) => {
  const reqLatitude = query.latitude;
  const reqLongitude = query.longitude;

  delete query.latitude;
  delete query.longitude;

  let lng: number | undefined;
  let lat: number | undefined;

  if (reqLatitude && reqLongitude) {
    lng = Number(reqLongitude);
    lat = Number(reqLatitude);
  }

  if (lng == null || lat == null || isNaN(lng) || isNaN(lat)) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Location coordinates (latitude and longitude) are strictly required to find nearby restaurants.',
    );
  }

  const globalSettings = await GlobalSettingsService.getGlobalSettings();
  const radiusInKm = globalSettings.customerNearestVendorRadiusKm;

  const latDelta = radiusInKm / 111;
  const lngDelta = radiusInKm / (111 * Math.cos(lat * (Math.PI / 180)));

  const activeProductVendorIds = await Product.distinct('vendorId', {
    isDeleted: false,
  });

  const filter: any = {
    _id: { $in: activeProductVendorIds },
    status: 'APPROVED',
    isDeleted: false,
    'businessLocation.latitude': {
      $gte: lat - latDelta,
      $lte: lat + latDelta,
    },
    'businessLocation.longitude': {
      $gte: lng - lngDelta,
      $lte: lng + lngDelta,
    },
  };

  if (query.restaurantCuisineType) {
    const cuisineInput = query.restaurantCuisineType as string;

    filter['businessDetails.restaurantCuisineType'] = {
      $regex: new RegExp(`^${cuisineInput.trim()}$`, 'i'),
    };
    delete query.restaurantCuisineType;
  }

  if (query.productCategory) {
    const categoryObjectId = new Types.ObjectId(
      query.productCategory as string,
    );

    const matchingVendorIds = await Product.distinct('vendorId', {
      category: categoryObjectId,
      isDeleted: false,
      vendorId: { $in: activeProductVendorIds },
    });

    if (matchingVendorIds.length === 0) {
      return {
        message: 'Vendors Retrieved Successfully',
        meta: {
          total: 0,
          page: 1,
          limit: Number(query.limit) || 10,
          totalPage: 0,
        },
        data: [],
      };
    }
    const activeVendorStrSet = new Set(
      activeProductVendorIds.map((id) => id.toString()),
    );

    const finalMatchingIds = matchingVendorIds
      .filter((id) => activeVendorStrSet.has(id.toString()))
      .map((id) => new Types.ObjectId(id.toString()));

    filter._id = { $in: finalMatchingIds };
    delete query.productCategory;
  }

  // ৫. QueryBuilder Execution
  const vendors = new QueryBuilder(Vendor.find(filter), query)
    .search(['businessDetails.businessName'])
    .filter()
    .sort()
    .paginate()
    .fields();

  vendors.modelQuery = vendors.modelQuery.select(
    'name userId businessDetails businessLocation documents rating currentSessionLocation',
  );

  const meta = await vendors.countTotal();
  const rawData = await vendors.modelQuery;

  const vendorIds = rawData.map((v: any) => v._id);

  const allActiveProducts = await Product.find({
    vendorId: { $in: vendorIds },
    isDeleted: false,
  })
    .select('vendorId category')
    .lean();

  const allCategoryIds = [
    ...new Set(allActiveProducts.map((p) => p.category?.toString())),
  ].filter(Boolean);

  const allCategories = await ProductCategory.find({
    _id: { $in: allCategoryIds },
  })
    .select('name icon')
    .lean();

  const data = rawData.map((vendor: any) => {
    const thisVendorProducts = allActiveProducts.filter(
      (p) => p.vendorId?.toString() === vendor._id.toString(),
    );

    const thisVendorCategoryIds = [
      ...new Set(thisVendorProducts.map((p) => p.category?.toString())),
    ];

    const populatedCategories = allCategories.filter((cat) =>
      thisVendorCategoryIds.includes(cat._id.toString()),
    );

    return {
      id: vendor._id,
      userId: vendor.userId,
      name: vendor.name,
      businessDetails: {
        businessName: vendor.businessDetails?.businessName,
        businessType: vendor.businessDetails?.businessType,
        restaurantCuisineType: vendor.businessDetails?.restaurantCuisineType,
        openingHours: vendor.businessDetails?.openingHours,
        closingHours: vendor.businessDetails?.closingHours,
        closingDays: vendor.businessDetails?.closingDays,
        isStoreOpen: vendor.businessDetails?.isStoreOpen,
      },
      businessLocation: vendor.businessLocation,
      storePhoto: vendor.documents?.storePhoto || '',
      rating: vendor.rating,
      currentSessionLocation: vendor.currentSessionLocation,
      availableCategories: populatedCategories,
    };
  });

  return {
    message: 'Vendors Retrieved Successfully',
    meta,
    data,
  };
};

export const VendorServices = {
  vendorUpdate,
  vendorDocImageUpload,
  deleteVendorDocument,
  updateVendorLiveLocation,
  toggleVendorStoreOpenClose,
  getAllVendors,
  getSingleVendor,
  getAllVendorsForCustomer,
  getSingleVendorForCustomer,
  getAllVendorsForCustomerPublic,
};
