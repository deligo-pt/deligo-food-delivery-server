/* eslint-disable @typescript-eslint/no-explicit-any */
import AppError from '../../errors/AppError';
import { TVendor, TVendorImageDocuments } from './vendor.interface';
import httpStatus from 'http-status';
import { Vendor } from './vendor.model';
import { QueryBuilder } from '../../builder/QueryBuilder';
import { VendorSearchableFields } from './vendor.constant';
import { BusinessCategory } from '../Category/category.model';
import { getPopulateOptions } from '../../utils/getPopulateOptions';
import { flattenObject } from '../../utils/flattenObject';
import { Product } from '../Product/product.model';
import { GlobalSettingsService } from '../GlobalSetting/globalSetting.service';
import { deleteSingleImageFromCloudinary } from '../../utils/deleteImage';
import { TLiveLocationPayload } from '../../constant/GlobalInterface/location.interface';
import { AuthUser } from '../AuthUser/authUser.model';
import {
  USER_ROLE,
  USER_STATUS,
} from '../../constant/GlobalConstant/user.constant';
import { TAuthUser } from '../AuthUser/authUser.interface';
import { Customer } from '../Customer/customer.model';
import mongoose from 'mongoose';
import { BusinessCategoryName } from '../Category/category.interface';

/**
 * Service to update vendor profile information.
 * Handles authorization, update-locking logic, business category validation,
 * GeoJSON location derivation, and safe nested updates using flattening.
 */
const vendorUpdate = async (
  id: string,
  payload: Partial<TVendor>,
  currentUser: TAuthUser,
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

  // 5. Business Validation: Verify that the provided business type exists in the database
  if (businessType) {
    const exists = await BusinessCategory.findOne({
      name: businessType,
    });

    if (!exists) {
      throw new AppError(httpStatus.BAD_REQUEST, 'Invalid business type.');
    }

    if (
      businessType === BusinessCategoryName.RESTAURANT &&
      !payload.businessDetails?.restaurantCuisineType
    ) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'Please select a cuisine type.',
      );
    }
  }

  // 6. GeoSpatial Data: Generate GeoJSON Point if latitude and longitude are provided
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

  return updatedVendor;
};

/**
 * Service to upload or update vendor document images (businessLicenseDoc, taxDoc, Store Photo, etc.)
 * Handles old image cleanup, authorization, and update-lock bypass for admins.
 */
const vendorDocImageUpload = async (
  payload: TVendorImageDocuments,
  currentUser: TAuthUser,
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
  currentUser: TAuthUser,
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
  await existingVendor.save();

  return {
    message: 'Vendor document image deleted successfully',
    data: existingVendor.documents,
  };
};

// vendor business location update service
const updateVendorLiveLocation = async (
  payload: TLiveLocationPayload,
  currentUser: TAuthUser,
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
const toggleVendorStoreOpenClose = async (currentUser: any) => {
  if (currentUser?.status !== 'APPROVED') {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `You are not approved to toggle store open/close. Your account is ${currentUser?.status}`,
    );
  }

  await currentUser.populate('userObjectId', 'businessDetails');
  const vendorProfile = currentUser.userObjectId;

  if (!vendorProfile) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Vendor profile not found');
  }

  vendorProfile.businessDetails!.isStoreOpen =
    !vendorProfile.businessDetails?.isStoreOpen;
  vendorProfile.businessDetails!.storeClosedAt = new Date();
  await (vendorProfile as any).save();
  return {
    message: `Store is ${
      vendorProfile?.businessDetails?.isStoreOpen ? 'open' : 'closed'
    }`,
  };
};

// get all vendors
const getAllVendors = async (
  query: Record<string, unknown>,
  currentUser: TAuthUser,
) => {
  if (currentUser?.status !== 'APPROVED') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      `You are not approved to view vendors. Your account is ${currentUser?.status}`,
    );
  }
  const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(currentUser.role);

  const queryFilter: any = { role: USER_ROLE.VENDOR };

  if (!isAdmin) {
    queryFilter.isDeleted = false;
  }
  const vendorQueryBase = AuthUser.find(queryFilter);
  const vendors = new QueryBuilder(vendorQueryBase, query)
    .search(VendorSearchableFields)
    .filter()
    .sort()
    .paginate()
    .fields();

  const populateOptions = getPopulateOptions(currentUser.role, {
    userObjectId: true,
    approvedBy: 'name userId role',
    rejectedBy: 'name userId role',
    blockedBy: 'name userId role',
  });

  populateOptions.forEach((option) => {
    vendors.modelQuery = vendors.modelQuery.populate(option);
  });

  const meta = await vendors.countTotal();
  const rawData = await vendors.modelQuery;
  const formattedData = rawData
    .map((authDoc: any) => {
      const vendorProfile = authDoc.userObjectId;

      if (!vendorProfile) return null;

      return {
        _id: vendorProfile._id,
        authUserId: authDoc._id,
        userId: authDoc.userId,
        email: authDoc.email,
        role: authDoc.role,
        status: authDoc.status,
        isDeleted: authDoc.isDeleted,
        isEmailVerified: authDoc.isEmailVerified,
        loginDevices: authDoc.loginDevices,

        ...vendorProfile.toObject(),
      };
    })
    .filter((item) => item !== null);

  return {
    meta,
    data: formattedData,
  };
};

// get single vendor
const getSingleVendor = async (vendorId: string, currentUser: TAuthUser) => {
  if (currentUser.role === 'VENDOR' && currentUser.userId !== vendorId) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'You are not authorize to access this vendor!',
    );
  }

  const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(currentUser.role);

  const findCondition: any = {
    userId: vendorId,
    role: USER_ROLE.VENDOR,
  };

  if (!isAdmin) {
    findCondition.isDeleted = false;
  }

  const vendorAuthQuery = AuthUser.findOne(findCondition);

  const populateOptions = getPopulateOptions(currentUser.role, {
    userObjectId: true,
    approvedBy: 'name userId role',
    rejectedBy: 'name userId role',
    blockedBy: 'name userId role',
  });

  populateOptions.forEach((option) => {
    vendorAuthQuery.populate(option);
  });

  const authDoc: any = await vendorAuthQuery;
  if (!authDoc || !authDoc.userObjectId) {
    throw new AppError(httpStatus.NOT_FOUND, 'Vendor profile not found!');
  }

  const vendorProfile = authDoc.userObjectId;

  const formattedVendor = {
    _id: vendorProfile._id,
    authUserId: authDoc._id,
    userId: authDoc.userId,
    email: authDoc.email,
    role: authDoc.role,
    status: authDoc.status,
    isDeleted: authDoc.isDeleted,
    isEmailVerified: authDoc.isEmailVerified,
    loginDevices: authDoc.loginDevices,

    ...vendorProfile.toObject(),
  };

  return formattedVendor;
};

// get all vendors for customer
const getAllVendorsForCustomer = async (
  query: Record<string, unknown>,
  currentUser: TAuthUser,
) => {
  const customerProfile = await Customer.findOne({
    userId: currentUser.userId,
  })
    .lean()
    .select('currentSessionLocation');

  if (!customerProfile) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      'Customer profile data not found!',
    );
  }

  const coordinates = customerProfile?.currentSessionLocation?.coordinates;

  if (!coordinates || coordinates.length < 2) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Location required. Please enable GPS to find nearby restaurants.',
    );
  }

  const globalSettings = await GlobalSettingsService.getGlobalSettings();
  const radiusInRadians = globalSettings.customerNearestVendorRadiusKm / 6378.1;
  const [lng, lat] = coordinates;

  const activeAuthVendors = await AuthUser.find({
    role: 'VENDOR',
    status: 'APPROVED',
    isDeleted: false,
  })
    .select('_id userObjectId')
    .lean();

  if (activeAuthVendors.length === 0) {
    return { meta: { total: 0, page: 1, limit: 10, totalPage: 0 }, data: [] };
  }

  const authIdToProfileIdMap = new Map();
  const profileIdToAuthIdMap = new Map();
  const approvedCentralAuthIds: mongoose.Types.ObjectId[] = [];
  const approvedProfileIds: mongoose.Types.ObjectId[] = [];

  activeAuthVendors.forEach((auth) => {
    authIdToProfileIdMap.set(auth._id.toString(), auth.userObjectId.toString());
    profileIdToAuthIdMap.set(auth.userObjectId.toString(), auth._id.toString());
    approvedCentralAuthIds.push(auth._id as any);
    approvedProfileIds.push(auth.userObjectId as any);
  });

  const activeProductCentralVendorIds = await Product.distinct('vendorId', {
    isDeleted: false,
    vendorId: { $in: approvedCentralAuthIds },
  });

  const activeProductProfileIds = activeProductCentralVendorIds
    .map((authId) => authIdToProfileIdMap.get(authId.toString()))
    .filter(Boolean);

  const filter: any = {
    _id: { $in: activeProductProfileIds },
    currentSessionLocation: {
      $geoWithin: {
        $centerSphere: [[lng, lat], radiusInRadians],
      },
    },
  };

  if (query.restaurantCuisineType) {
    if (
      typeof query.restaurantCuisineType === 'string' &&
      query.restaurantCuisineType.includes(',')
    ) {
      const cuisineArray = query.restaurantCuisineType
        .split(',')
        .map((item) => item.trim());
      filter['businessDetails.restaurantCuisineType'] = { $in: cuisineArray };
    } else {
      filter['businessDetails.restaurantCuisineType'] =
        query.restaurantCuisineType;
    }

    delete query.restaurantCuisineType;
  }

  if (query.productCategory) {
    const matchingCentralVendorIds = await Product.distinct('vendorId', {
      category: query.productCategory,
      isDeleted: false,
      vendorId: { $in: approvedCentralAuthIds },
    });

    const matchingProfileIds = matchingCentralVendorIds
      .map((authId) => authIdToProfileIdMap.get(authId.toString()))
      .filter(Boolean);

    if (matchingProfileIds.length === 0) {
      return {
        meta: {
          total: 0,
          page: 1,
          limit: Number(query.limit) || 10,
          totalPage: 0,
        },
        data: [],
      };
    }
    filter._id = { $in: matchingProfileIds };
    delete query.productCategory;
  }

  const vendorsQuery = Vendor.find(filter);
  const vendors = new QueryBuilder(vendorsQuery, query)
    .filter()
    .sort()
    .paginate()
    .fields()
    .search(['businessDetails.businessName']);

  vendors.modelQuery = vendors.modelQuery.select(
    'name userId businessDetails businessLocation documents rating currentSessionLocation',
  );

  const meta = await vendors.countTotal();
  const rawVendors = await vendors.modelQuery;

  const currentVendorProfileIds = rawVendors.map((v) => v._id.toString());
  const currentCentralAuthIds = currentVendorProfileIds
    .map((profId) => profileIdToAuthIdMap.get(profId))
    .filter(Boolean);

  const allProductsForTheseVendors = await Product.find({
    vendorId: { $in: currentCentralAuthIds },
    isDeleted: false,
  })
    .populate({
      path: 'category',
      select: 'name icon',
    })
    .lean();

  const data = rawVendors.map((vendor: any) => {
    const vendorCentralAuthId = profileIdToAuthIdMap.get(vendor._id.toString());

    const vendorProducts = allProductsForTheseVendors.filter(
      (p: any) => String(p.vendorId) === String(vendorCentralAuthId),
    );

    const categoryMap = new Map();
    vendorProducts.forEach((product: any) => {
      if (product.category && !categoryMap.has(String(product.category._id))) {
        categoryMap.set(String(product.category._id), product.category);
      }
    });

    const availableCategories = Array.from(categoryMap.values());

    return {
      id: vendor._id,
      userId: vendor.userId,
      name: vendor.name,
      businessDetails: {
        businessName: vendor.businessDetails?.businessName,
        businessType: vendor.businessDetails?.businessType,
        openingHours: vendor.businessDetails?.openingHours,
        closingHours: vendor.businessDetails?.closingHours,
        closingDays: vendor.businessDetails?.closingDays,
        isStoreOpen: vendor.businessDetails?.isStoreOpen,
      },
      businessLocation: vendor.businessLocation,
      storePhoto: vendor.documents?.storePhoto || [],
      rating: vendor.rating,
      currentSessionLocation: vendor.currentSessionLocation,
      availableCategories,
    };
  });

  return {
    meta,
    data,
  };
};

// get single vendor for customer
const getSingleVendorForCustomer = async (vendorId: string) => {
  const isObjectId = mongoose.Types.ObjectId.isValid(vendorId);
  const queryCondition = isObjectId ? { _id: vendorId } : { userId: vendorId };

  const vendorAuth = await AuthUser.findOne({
    ...queryCondition,
    role: 'VENDOR',
    status: 'APPROVED',
    isDeleted: false,
  }).populate({
    path: 'userObjectId',
    model: 'Vendor',
    select:
      'name userId businessDetails businessLocation documents rating currentSessionLocation',
  });

  if (!vendorAuth || !vendorAuth.userObjectId) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      'Vendor profile not found or currently unavailable!',
    );
  }

  const vendorProfile = vendorAuth.userObjectId as any;

  const formattedVendor = {
    id: vendorProfile._id,
    userId: vendorAuth.userId,
    name: vendorProfile.name,
    email: vendorAuth.email || '',
    contactNumber: (vendorAuth as any).contactNumber || '',
    businessDetails: {
      businessName: vendorProfile.businessDetails?.businessName,
      businessType: vendorProfile.businessDetails?.businessType,
      openingHours: vendorProfile.businessDetails?.openingHours,
      closingHours: vendorProfile.businessDetails?.closingHours,
      closingDays: vendorProfile.businessDetails?.closingDays,
      isStoreOpen: vendorProfile.businessDetails?.isStoreOpen,
    },
    businessLocation: vendorProfile.businessLocation,
    storePhoto: vendorProfile.documents?.storePhoto || [],
    rating: vendorProfile.rating,
    currentSessionLocation: vendorProfile.currentSessionLocation || null,
  };

  return formattedVendor;
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
};
