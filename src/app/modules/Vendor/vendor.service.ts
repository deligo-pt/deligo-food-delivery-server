/* eslint-disable @typescript-eslint/no-explicit-any */
import AppError from '../../errors/AppError';
import { TVendor } from './vendor.interface';
import httpStatus from 'http-status';
import { Vendor } from './vendor.model';
import { AuthUser } from '../../constant/user.constant';
import { QueryBuilder } from '../../builder/QueryBuilder';
import { VendorSearchableFields } from './vendor.constant';
import { BusinessCategory, ProductCategory } from '../Category/category.model';
import { getPopulateOptions } from '../../utils/getPopulateOptions';
import { TLiveLocationPayload } from '../../constant/GlobalInterface/global.interface';
import { flattenObject } from '../../utils/flattenObject';
import { Product } from '../Product/product.model';
import { GlobalSettingsService } from '../GlobalSetting/globalSetting.service';
import { generateReferralCode } from '../../utils/generateReferralCode';

/**
 * Service to update vendor profile information.
 * Handles authorization, update-locking logic, business category validation,
 * GeoJSON location derivation, and safe nested updates using flattening.
 */
const vendorUpdate = async (
  id: string,
  payload: Partial<TVendor>,
  currentUser: AuthUser,
) => {
  // 1. Initial check to ensure the vendor exists in the system
  const existingVendor = await Vendor.findOne({ customUserId: id });

  if (!existingVendor) {
    throw new AppError(httpStatus.NOT_FOUND, 'Vendor not found.');
  }

  // 2. Define access control: Admins/Super Admins or the Account Owner (Vendor/Sub-Vendor)
  const isStaff = ['ADMIN', 'SUPER_ADMIN'].includes(currentUser.role);
  const isOwner =
    (currentUser.role === 'VENDOR' || currentUser.role === 'SUB_VENDOR') &&
    currentUser.customUserId === existingVendor.customUserId;

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

  // -----------------------------
  // Referral Code Generation (New Logic)
  // -----------------------------
  if (!currentUser.referralCode) {
    const firstName = 'USER';
    const newReferralCode = await generateReferralCode(firstName);

    payload.referralCode = newReferralCode;
  }

  // 5. Business Validation: Verify that the provided business type exists in the database
  if (payload.businessDetails?.businessType) {
    const exists = await BusinessCategory.findOne({
      name: payload.businessDetails.businessType,
    });

    if (!exists) {
      throw new AppError(httpStatus.BAD_REQUEST, 'Invalid business type.');
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
    { customUserId: existingVendor.customUserId },
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

  if (currentUser?.customUserId !== vendorId) {
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
    { customUserId: currentUser.customUserId },
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
    approvedBy: 'name customUserId role',
    rejectedBy: 'name customUserId role',
    blockedBy: 'name customUserId role',
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
const getSingleVendor = async (vendorId: string, currentUser: AuthUser) => {
  if (currentUser.role === 'VENDOR' && currentUser.customUserId !== vendorId) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'You are not authorize to access this vendor!',
    );
  }

  let query: any;
  if (currentUser.role === 'VENDOR') {
    query = Vendor.findOne({
      customUserId: currentUser.customUserId,
      isDeleted: false,
    });
  } else {
    query = Vendor.findOne({
      customUserId: vendorId,
    });
  }

  const populateOptions = getPopulateOptions(currentUser.role, {
    approvedBy: 'name customUserId role',
    rejectedBy: 'name customUserId role',
    blockedBy: 'name customUserId role',
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

// get all vendors for customer
const getAllVendorsForCustomer = async (
  query: Record<string, unknown>,
  currentUser: AuthUser,
) => {
  // 1. Get Customer Coordinates from currentSessionLocation

  const coordinates = currentUser?.currentSessionLocation?.coordinates;

  if (!coordinates || coordinates.length < 2) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Location required. Please enable GPS to find nearby restaurants.',
    );
  }

  const globalSettings = await GlobalSettingsService.getGlobalSettings();

  const [lng, lat] = coordinates;
  const radiusInRadians = globalSettings.customerNearestVendorRadiusKm / 6378.1;

  const activeProductVendorIds = await Product.distinct('vendorId', {
    isDeleted: false,
  });

  // 2. Filter vendors
  const filter: any = {
    _id: { $in: activeProductVendorIds },
    status: 'APPROVED',
    isDeleted: false,
    currentSessionLocation: {
      $geoWithin: {
        $centerSphere: [[lng, lat], radiusInRadians],
      },
    },
  };

  // 3. Category Filter Logic
  if (query.productCategory) {
    const matchingVendorIds = await Product.distinct('vendorId', {
      category: query.productCategory,
      isDeleted: false,
      vendorId: { $in: activeProductVendorIds },
    });

    if (matchingVendorIds.length === 0) {
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
    filter._id = { $in: matchingVendorIds };
    delete query.productCategory;
  }

  // 4. QueryBuilder Execution
  const vendors = new QueryBuilder(Vendor.find(filter), query)
    .search(['businessDetails.businessName'])
    .filter()
    .sort()
    .paginate()
    .fields();

  // 5. Select parent paths to avoid 'Path Collision'
  vendors.modelQuery = vendors.modelQuery.select(
    'name customUserId  businessDetails businessLocation documents rating currentSessionLocation',
  );

  const meta = await vendors.countTotal();
  const rawData = await vendors.modelQuery;

  // 6. Map to the exact structure required by your Frontend

  const data = await Promise.all(
    rawData.map(async (vendor: any) => {
      // Find unique categories for this specific vendor from Product model
      const vendorCategories = await Product.distinct('category', {
        vendorId: vendor._id,
        isDeleted: false,
      });

      // Populate category details (optional: if you need name/icon)
      const populatedCategories = await ProductCategory.find({
        _id: { $in: vendorCategories },
      }).select('name icon'); // Assuming you have name and icon in ProductCategory

      return {
        id: vendor._id,
        customUserId: vendor.customUserId,
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
        storePhoto: vendor.documents?.storePhoto || '',
        rating: vendor.rating,
        currentSessionLocation: vendor.currentSessionLocation,
        // Adding the categories here
        availableCategories: populatedCategories,
      };
    }),
  );

  return {
    meta,
    data,
  };
};

export const VendorServices = {
  vendorUpdate,
  updateVendorLiveLocation,
  toggleVendorStoreOpenClose,
  getAllVendors,
  getSingleVendor,
  getAllVendorsForCustomer,
};
