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
import { Customer } from '../Customer/customer.model';
import { Types } from 'mongoose';
import { TMessageKey } from '../../errors/messages';
import { TLanguageCode } from '../../constant/GlobalInterface/language.interface';
import { BusinessCategoryTranslation } from '../Category/category.interface';

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
    throw new AppError(httpStatus.NOT_FOUND, 'VENDOR_NOT_FOUND_WITH_DOT');
  }

  // 2. Define access control: Admins/Super Admins or the Account Owner (Vendor/Sub-Vendor)
  const isStaff = ['ADMIN', 'SUPER_ADMIN'].includes(currentUser.role);
  const isOwner =
    (currentUser.role === 'VENDOR' || currentUser.role === 'SUB_VENDOR') &&
    currentUser.userId === existingVendor.userId;

  // 3. Authorization: Block unauthorized users from modifying the vendor profile
  if (!isStaff && !isOwner) {
    throw new AppError(httpStatus.FORBIDDEN, 'NOT_AUTHORIZED_FOR_ACTION');
  }

  // 4. Update-Lock: Prevent changes if the profile is locked, unless bypassed by an Admin
  if (existingVendor.isUpdateLocked && !isStaff) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'VENDOR_UPDATE_LOCKED_CONTACT_SUPPORT',
    );
  }

  const businessTypeSlug = payload.businessDetails
    ?.businessType as unknown as string;
  const cuisineTypeSlug = payload.businessDetails
    ?.restaurantCuisineType as unknown as string[];

  // 5. Business Validation: Verify that the provided business type exists in the database
  if (businessTypeSlug) {
    const businessCategory = await BusinessCategory.findOne({
      slug: businessTypeSlug,
    }).lean();

    if (!businessCategory) {
      throw new AppError(httpStatus.BAD_REQUEST, 'INVALID_BUSINESS_TYPE');
    }

    payload.businessDetails!.businessType = businessCategory._id;
    const isRestaurant = businessTypeSlug === 'restaurant';

    if (isRestaurant && !cuisineTypeSlug) {
      throw new AppError(httpStatus.BAD_REQUEST, 'PLEASE_SELECT_CUISINE_TYPE');
    }

    if (isRestaurant && cuisineTypeSlug && !Array.isArray(cuisineTypeSlug)) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'PLEASE_SELECT_AT_LEAST_ONE_CUISINE_TYPE',
      );
    }

    if (cuisineTypeSlug && cuisineTypeSlug.length > 0) {
      const cuisineTypeExists = await Cuisine.find({
        slug: { $in: cuisineTypeSlug },
      });
      if (cuisineTypeExists.length !== cuisineTypeSlug.length) {
        throw new AppError(httpStatus.BAD_REQUEST, 'INVALID_CUISINE_TYPE');
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
  )
    .populate('businessDetails.businessType')
    .populate('cuisinesData');

  if (!updatedVendor) {
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'FAILED_TO_UPDATE_VENDOR',
    );
  }

  return {
    messageKey: 'VENDOR_UPDATED_SUCCESS' as TMessageKey,
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
    throw new AppError(httpStatus.NOT_FOUND, 'VENDOR_NOT_FOUND');
  }

  const { docImageTitle, docImageUrls } = payload;

  // 2. Define user roles and access rights
  const isStaff = ['ADMIN', 'SUPER_ADMIN'].includes(currentUser.role);
  const isOwner =
    (currentUser.role === 'VENDOR' || currentUser.role === 'SUB_VENDOR') &&
    currentUser.userId === existingVendor.userId;

  // 3. Authorization: Only Admins or the Account Owner can perform this action
  if (!isStaff && !isOwner) {
    throw new AppError(httpStatus.FORBIDDEN, 'NOT_AUTHORIZED_FOR_ACTION');
  }

  // 4. Protection: Block updates if the profile is locked (Admins can bypass this lock)
  if (existingVendor.isUpdateLocked && !isStaff) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'VENDOR_UPDATE_LOCKED_CONTACT_SUPPORT',
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
        'MAXIMUM_IMAGES_ALLOWED_FOR_DOCUMENT',
        {
          title: payload.docImageTitle,
          existing: previousImages.length,
          adding: docImageUrls.length,
        },
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
    messageKey: 'VENDOR_DOCUMENT_IMAGE_UPDATED_SUCCESS' as TMessageKey,
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
    throw new AppError(httpStatus.NOT_FOUND, 'VENDOR_NOT_FOUND');

  const isStaff = ['ADMIN', 'SUPER_ADMIN'].includes(currentUser.role);
  const isOwner = currentUser.userId === existingVendor.userId;
  if (!isStaff && !isOwner)
    throw new AppError(httpStatus.FORBIDDEN, 'NOT_AUTHORIZED_FOR_ACTION');

  if (existingVendor.isUpdateLocked && !isStaff) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'PROFILE_LOCKED_CONTACT_SUPPORT',
    );
  }

  const docArray = (existingVendor.documents as any)[docImageTitle];
  if (!Array.isArray(docArray) || !docArray.includes(imageUrl)) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      'IMAGE_NOT_FOUND_IN_DOCUMENT_CATEGORY',
    );
  }

  await deleteSingleImageFromCloudinary(imageUrl).catch((err) => {
    void err;
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
    messageKey: 'VENDOR_DOCUMENT_IMAGE_DELETED_SUCCESS' as TMessageKey,
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
      'NOT_APPROVED_TO_UPDATE_LIVE_LOCATION',
      { status: currentUser?.status || 'UNKNOWN' },
    );
  }

  if (currentUser?.userId !== vendorId) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'NOT_AUTHORIZED_TO_UPDATE_LIVE_LOCATION',
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
    throw new AppError(httpStatus.BAD_REQUEST, 'GEO_ACCURACY_LESS_THAN_100');
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
      'VENDOR_NOT_FOUND_OR_UPDATE_FAILED',
    );
  }

  return {
    success: true,
    messageKey: 'LIVE_LOCATION_UPDATED_SUCCESS' as TMessageKey,
    data: updatedVendor.currentSessionLocation,
  };
};

// toggle vendor store open/close service
const toggleVendorStoreOpenClose = async (currentUser: TCurrentUser) => {
  if (currentUser?.status !== 'APPROVED') {
    throw new AppError(httpStatus.BAD_REQUEST, 'NOT_APPROVED_TO_TOGGLE_STORE', {
      status: currentUser?.status || 'UNKNOWN',
    });
  }

  currentUser.businessDetails!.isStoreOpen =
    !currentUser.businessDetails?.isStoreOpen;
  currentUser.businessDetails!.storeClosedAt = new Date();
  await (currentUser as any).save();
  return {
    messageKey: 'STORE_STATUS_MESSAGE' as TMessageKey,
    variables: {
      isOpen: !!currentUser?.businessDetails?.isStoreOpen,
    },
    data: null,
  };
};

// get all vendors
const getAllVendors = async (
  query: Record<string, unknown>,
  currentUser: TCurrentUser,
) => {
  if (currentUser?.status !== 'APPROVED') {
    throw new AppError(httpStatus.FORBIDDEN, 'NOT_APPROVED_TO_VIEW_VENDORS', {
      status: currentUser?.status || 'UNKNOWN',
    });
  }

  const filter: any = {};

  if (query.businessType) {
    const businessTypeSlug = (query.businessType as string)
      .trim()
      .toLowerCase();

    const businessCategory = await BusinessCategory.findOne({
      slug: businessTypeSlug,
    }).lean();

    if (!businessCategory) {
      throw new AppError(httpStatus.BAD_REQUEST, 'INVALID_BUSINESS_TYPE');
    }

    if (businessCategory) {
      filter['businessDetails.businessType'] = businessCategory._id;
    }

    delete query.businessType;
    delete query['businessDetails.businessType'];
  }

  const vendors = new QueryBuilder(Vendor.find(filter), query)
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

  vendors.modelQuery = vendors.modelQuery
    .populate('businessDetails.businessType')
    .populate('cuisinesData');

  const meta = await vendors.countTotal();
  const data = await vendors.modelQuery;

  return {
    messageKey: 'VENDORS_RETRIEVED_SUCCESS' as TMessageKey,
    meta,
    data,
  };
};

// get single vendor
const getSingleVendor = async (vendorId: string, currentUser: TCurrentUser) => {
  if (currentUser.role === 'VENDOR' && currentUser.userId !== vendorId) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'NOT_AUTHORIZED_TO_ACCESS_VENDOR',
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

  query = query.populate('cuisinesData');

  const existingVendor = await query;
  if (!existingVendor) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      'VENDOR_NOT_FOUND_WITH_EXCLAMATION',
    );
  }

  return {
    messageKey: 'VENDOR_RETRIEVED_SUCCESS' as TMessageKey,
    data: existingVendor,
  };
};

// get all vendors for customer
const getAllVendorsForCustomer = async (
  query: Record<string, unknown>,
  currentUser: TCurrentUser,
  lang: TLanguageCode = 'en',
) => {
  // 1. Initial check to ensure the customer exists
  const customerProfile = await Customer.findOne({
    userId: currentUser.userId,
    isDeleted: false,
  }).lean();

  if (!customerProfile) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      'CUSTOMER_PROFILE_NOT_FOUND_SETUP_FIRST',
    );
  }

  // 2. Location Resolution (Active Address or Session GPS Location)
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
      'LOCATION_REQUIRED_SELECT_ADDRESS_OR_ENABLE_GPS',
    );
  }

  // Get operational radius from global settings
  const globalSettings = await GlobalSettingsService.getGlobalSettings();
  const radiusInKm = globalSettings.customerNearestVendorRadiusKm;

  // Optimize vendor pool: Only include vendors who have active products
  const activeProductVendorIds = await Product.distinct('vendorId', {
    isDeleted: false,
  });

  // 3. Base Query Filter Setup (Geospatial + Status Checks)
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
        $maxDistance: radiusInKm * 1000, // Conversion to meters
      },
    },
  };

  const businessTypeInput = (query['businessDetails.businessType'] ||
    query.businessType) as string;

  if (businessTypeInput) {
    const upperInput = businessTypeInput.trim().toUpperCase();

    const translation =
      BusinessCategoryTranslation[
        upperInput as keyof typeof BusinessCategoryTranslation
      ];

    if (!translation) {
      throw new AppError(httpStatus.BAD_REQUEST, 'INVALID_BUSINESS_TYPE');
    }

    filter['businessDetails.businessType.en'] = translation.en;
    filter['businessDetails.businessType.pt'] = translation.pt;

    delete query['businessDetails.businessType'];
    delete query.businessType;
  }

  if (query.restaurantCuisineType) {
    const cuisineSlugInput = (query.restaurantCuisineType as string)
      .trim()
      .toLowerCase();

    filter['businessDetails.restaurantCuisineType'] = cuisineSlugInput;

    delete query.restaurantCuisineType;
  }

  // Product Category Filter Setup
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
        messageKey: 'VENDORS_RETRIEVED_SUCCESS' as TMessageKey,
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

  vendors.modelQuery = vendors.modelQuery
    .select(
      'name userId businessDetails businessLocation documents rating currentSessionLocation',
    )
    .populate('cuisinesData');

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
    const vendorObj = vendor.toObject?.() || vendor;

    const thisVendorProducts = allActiveProducts.filter(
      (p) => p.vendorId?.toString() === vendorObj._id.toString(),
    );

    const thisVendorCategoryIds = [
      ...new Set(thisVendorProducts.map((p) => p.category?.toString())),
    ];

    const populatedCategories = allCategories.filter((cat) =>
      thisVendorCategoryIds.includes(cat._id.toString()),
    );

    const formattedCategories = populatedCategories.map((cat: any) => {
      const categoryName =
        cat.name && typeof cat.name === 'object'
          ? cat.name[lang] || cat.name['en'] || ''
          : cat.name || '';

      return {
        _id: cat._id,
        name: categoryName,
        icon: cat.icon,
      };
    });

    const rawBusinessType = vendorObj.businessDetails?.businessType;
    const formattedBusinessType =
      rawBusinessType && typeof rawBusinessType === 'object'
        ? rawBusinessType[lang] || rawBusinessType['en'] || ''
        : rawBusinessType || '';

    let formattedCuisines: string[] = [];
    if (
      Array.isArray(vendorObj.cuisinesData) &&
      vendorObj.cuisinesData.length > 0
    ) {
      formattedCuisines = vendorObj.cuisinesData.map(
        (cuisine: any) => cuisine.name?.[lang] || cuisine.name?.['en'] || '',
      );
    } else if (
      Array.isArray(vendorObj.businessDetails?.restaurantCuisineType)
    ) {
      formattedCuisines = vendorObj.businessDetails.restaurantCuisineType.map(
        (c: string) =>
          typeof c === 'string' ? c.charAt(0).toUpperCase() + c.slice(1) : c,
      );
    }

    return {
      id: vendorObj._id,
      userId: vendorObj.userId,
      name: vendorObj.name,
      businessDetails: {
        businessName: vendorObj.businessDetails?.businessName,
        businessType: formattedBusinessType,
        restaurantCuisineType: formattedCuisines,
        openingHours: vendorObj.businessDetails?.openingHours,
        closingHours: vendorObj.businessDetails?.closingHours,
        closingDays: vendorObj.businessDetails?.closingDays,
        isStoreOpen: vendorObj.businessDetails?.isStoreOpen,
      },
      businessLocation: vendorObj.businessLocation,
      storePhoto: vendorObj.documents?.storePhoto || '',
      rating: vendorObj.rating,
      currentSessionLocation: vendorObj.currentSessionLocation,
      availableCategories: formattedCategories,
    };
  });

  return {
    messageKey: 'VENDORS_RETRIEVED_SUCCESS' as TMessageKey,
    meta,
    data,
  };
};

// get single vendor for customer
const getSingleVendorForCustomer = async (vendorId: string) => {
  const existingVendor = await Vendor.findOne({
    userId: vendorId,
    isDeleted: false,
  })
    .select('name userId email contactNumber businessDetails businessLocation')
    .populate('cuisinesData');
  if (!existingVendor) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      'VENDOR_NOT_FOUND_WITH_EXCLAMATION',
    );
  }

  return {
    messageKey: 'VENDOR_RETRIEVED_SUCCESS' as TMessageKey,
    data: existingVendor,
  };
};

const getAllVendorsForCustomerPublic = async (
  query: Record<string, unknown>,
  lang: TLanguageCode = 'en',
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
      'LOCATION_COORDINATES_REQUIRED_FOR_NEARBY_RESTAURANTS',
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

  const businessTypeInput = (query['businessDetails.businessType'] ||
    query.businessType) as string;

  if (businessTypeInput) {
    const upperInput = businessTypeInput.trim().toUpperCase();

    const translation =
      BusinessCategoryTranslation[
        upperInput as keyof typeof BusinessCategoryTranslation
      ];

    if (!translation) {
      throw new AppError(httpStatus.BAD_REQUEST, 'INVALID_BUSINESS_TYPE');
    }

    filter['businessDetails.businessType.en'] = translation.en;
    filter['businessDetails.businessType.pt'] = translation.pt;

    delete query['businessDetails.businessType'];
    delete query.businessType;
  }

  if (query.restaurantCuisineType) {
    const cuisineSlugInput = (query.restaurantCuisineType as string)
      .trim()
      .toLowerCase();

    filter['businessDetails.restaurantCuisineType'] = cuisineSlugInput;

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
        messageKey: 'VENDORS_RETRIEVED_SUCCESS' as TMessageKey,
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

  const vendors = new QueryBuilder(Vendor.find(filter), query)
    .search(['businessDetails.businessName'])
    .filter()
    .sort()
    .paginate()
    .fields();

  vendors.modelQuery = vendors.modelQuery
    .select(
      'name userId businessDetails businessLocation documents rating currentSessionLocation',
    )
    .populate('cuisinesData');

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
    const vendorObj = vendor.toObject?.() || vendor;

    const thisVendorProducts = allActiveProducts.filter(
      (p) => p.vendorId?.toString() === vendorObj._id.toString(),
    );

    const thisVendorCategoryIds = [
      ...new Set(thisVendorProducts.map((p) => p.category?.toString())),
    ];

    const populatedCategories = allCategories.filter((cat) =>
      thisVendorCategoryIds.includes(cat._id.toString()),
    );

    const formattedCategories = populatedCategories.map((cat: any) => {
      const categoryName =
        cat.name && typeof cat.name === 'object'
          ? cat.name[lang] || cat.name['en'] || ''
          : cat.name || '';

      return {
        _id: cat._id,
        name: categoryName,
        icon: cat.icon,
      };
    });

    const rawBusinessType = vendorObj.businessDetails?.businessType;
    const formattedBusinessType =
      rawBusinessType && typeof rawBusinessType === 'object'
        ? rawBusinessType[lang] || rawBusinessType['en'] || ''
        : rawBusinessType || '';

    let formattedCuisines: string[] = [];
    if (
      Array.isArray(vendorObj.cuisinesData) &&
      vendorObj.cuisinesData.length > 0
    ) {
      formattedCuisines = vendorObj.cuisinesData.map(
        (cuisine: any) => cuisine.name?.[lang] || cuisine.name?.['en'] || '',
      );
    } else if (
      Array.isArray(vendorObj.businessDetails?.restaurantCuisineType)
    ) {
      formattedCuisines = vendorObj.businessDetails.restaurantCuisineType.map(
        (c: string) =>
          typeof c === 'string' ? c.charAt(0).toUpperCase() + c.slice(1) : c,
      );
    }

    return {
      id: vendorObj._id,
      userId: vendorObj.userId,
      name: vendorObj.name,
      businessDetails: {
        businessName: vendorObj.businessDetails?.businessName,
        businessType: formattedBusinessType,
        restaurantCuisineType: formattedCuisines,
        openingHours: vendorObj.businessDetails?.openingHours,
        closingHours: vendorObj.businessDetails?.closingHours,
        closingDays: vendorObj.businessDetails?.closingDays,
        isStoreOpen: vendorObj.businessDetails?.isStoreOpen,
      },
      businessLocation: vendorObj.businessLocation,
      storePhoto: vendorObj.documents?.storePhoto || '',
      rating: vendorObj.rating,
      currentSessionLocation: vendorObj.currentSessionLocation,
      availableCategories: formattedCategories,
    };
  });

  return {
    messageKey: 'VENDORS_RETRIEVED_SUCCESS' as TMessageKey,
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
