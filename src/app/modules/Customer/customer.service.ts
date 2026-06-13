/* eslint-disable @typescript-eslint/no-explicit-any */
import { QueryBuilder } from '../../builder/QueryBuilder';
import AppError from '../../errors/AppError';
import httpStatus from 'http-status';
import { TCurrentUser } from '../../constant/GlobalInterface/user.interface';
import { TCustomer, TCustomerLiveLocationPayload } from './customer.interface';
import { Customer } from './customer.model';
import { CustomerSearchableFields } from './customer.constant';
import { TDeliveryAddress } from '../../constant/GlobalInterface/address.interface';
import { getPopulateOptions } from '../../utils/getPopulateOptions';
import { generateReferralCode } from '../../utils/generateReferralCode';
import { TLiveLocationPayload } from '../../constant/GlobalInterface/location.interface';
import { flattenObject } from '../../utils/flattenObject';
import { AuthUser } from '../AuthUser/authUser.model';

// update customer service
const updateCustomer = async (
  payload: Partial<TCustomer>,
  customerId: string,
  currentUser: TCurrentUser,
) => {
  if (currentUser.status !== 'APPROVED') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      `Access denied. Your account is currently ${currentUser.status.toLowerCase()}. Please complete any pending requirements or contact support for assistance.`,
    );
  }

  const customer = await AuthUser.findOne({
    userId: customerId,
    isDeleted: false,
  }).populate('profileId');

  if (!customer) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      'Account not found. Please ensure that you have the correct user Id.',
    );
  }

  if (customer.requiresOtpVerification) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Verification required. Please complete the identity verification process by entering your OTP to continue.',
    );
  }

  const customerProfile = customer.profileId as any;

  if (!customerProfile) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      'Profile details not found. Please complete your profile setup to proceed.',
    );
  }

  if (
    currentUser.role === 'CUSTOMER' &&
    currentUser.userId !== customer.userId
  ) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "You don't have permission to update this profile. If you believe this is a mistake, please reach out to our support team.",
    );
  }

  // -----------------------------
  // Referral Code Generation (New Logic)
  // -----------------------------
  if (!customerProfile.referralCode) {
    const firstName =
      payload.name?.firstName || customerProfile.name.firstName || 'USER';
    const newReferralCode = await generateReferralCode(firstName);

    payload.referralCode = newReferralCode;
  }

  const finalUpdatePayload = flattenObject(payload);

  // ----------------------------------------------------------------------
  // Final Update
  // ----------------------------------------------------------------------
  const updated = await Customer.findOneAndUpdate(
    { userId: customerId },
    { $set: finalUpdatePayload },
    { new: true, runValidators: true },
  ).select(
    'name address deliveryAddresses NIF userId profilePhoto currentSessionLocation',
  );

  return updated;
};

// --------------------------------------------------------------
// Customer live location update service will be added here
// --------------------------------------------------------------
const updateCustomerLiveLocation = async (
  payload: TCustomerLiveLocationPayload,
  currentUser: TCurrentUser,
  customerId: string,
) => {
  if (currentUser?.status !== 'APPROVED') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      `Location updates are currently unavailable for your account status (${currentUser?.status.toLowerCase()}). Please contact support for more information.`,
    );
  }

  if (currentUser?.userId !== customerId) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "You're not authorized to update the location for this account.",
    );
  }

  const { latitude, longitude, geoAccuracy, isMocked } = payload;

  if (geoAccuracy !== undefined && geoAccuracy > 100) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Low location accuracy detected. Please ensure your device's location services are working correctly and try again.",
    );
  }

  const currentSessionLocation: Record<string, any> = {
    type: 'Point',
    coordinates: [longitude, latitude],
    lastLocationUpdate: new Date(),
  };

  if (isMocked !== undefined) {
    currentSessionLocation.isMocked = isMocked;
  }

  let updateData: Record<string, any> = {
    currentSessionLocation,
  };

  const customerExists = await Customer.findOne({ userId: currentUser.userId });
  if (!customerExists) {
    throw new AppError(httpStatus.NOT_FOUND, 'Customer profile not found.');
  }

  const hasPrimaryAddress = customerExists.deliveryAddresses?.some(
    (addr: any) => addr.addressType === 'PRIMARY',
  );

  let updateQuery: Record<string, any> = {};

  const { geoAccuracy: _, isMocked: ___, ...cleanAddressPayload } = payload;

  if (hasPrimaryAddress) {
    const addressDataWithCoords = {
      ...cleanAddressPayload,
      longitude,
      latitude,
      addressType: 'PRIMARY',
      isActive: true,
    };

    const flattenedAddressFields = flattenObject(
      addressDataWithCoords,
      'deliveryAddresses.$[elem]',
    );

    updateQuery['$set'] = {
      ...updateData,
      ...flattenedAddressFields,
    };
  } else {
    updateQuery['$set'] = updateData;
    updateQuery['$push'] = {
      deliveryAddresses: {
        street: cleanAddressPayload.street || '',
        city: cleanAddressPayload.city || '',
        state: cleanAddressPayload.state || '',
        postalCode: cleanAddressPayload.postalCode || '',
        country: cleanAddressPayload.country || '',
        detailedAddress: cleanAddressPayload.detailedAddress || '',
        notes: cleanAddressPayload.notes || '',
        longitude,
        latitude,
        addressType: 'PRIMARY',
        isActive: true,
      },
    };
  }

  const updatedCustomer = await Customer.findOneAndUpdate(
    { userId: currentUser.userId },
    updateQuery,
    {
      new: true,
      runValidators: true,
      arrayFilters: hasPrimaryAddress
        ? [{ 'elem.addressType': 'PRIMARY' }]
        : undefined,
    },
  );

  if (!updatedCustomer) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      'We encountered an issue while updating your location. Please try again.',
    );
  }

  return {
    success: true,
    message: 'Live location and PRIMARY delivery address updated successfully',
    data: {
      currentSessionLocation: updatedCustomer.currentSessionLocation,
      deliveryAddresses: updatedCustomer.deliveryAddresses,
    },
  };
};

// --------------------------------------------------------------
// Delivery address service will be added here
// --------------------------------------------------------------
const addDeliveryAddress = async (
  deliveryAddress: TDeliveryAddress,
  currentUser: TCurrentUser,
) => {
  // --------------------------------------------------
  // Validate payload
  // --------------------------------------------------
  if (
    !deliveryAddress.street?.trim() ||
    !deliveryAddress.city?.trim() ||
    !deliveryAddress.country?.trim() ||
    !deliveryAddress.state?.trim() ||
    !deliveryAddress.postalCode?.trim() ||
    !deliveryAddress.latitude ||
    !deliveryAddress.longitude
  ) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Please fill in all address fields, including street, city, state, country, postal code, and map location, so we can deliver to you accurately.',
    );
  }

  if (currentUser?.role !== 'CUSTOMER') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'Only customer accounts can add delivery addresses.',
    );
  }

  const customerProfile = await Customer.findOne({
    userId: currentUser.userId,
  });
  if (!customerProfile) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      "We couldn't find your profile. Please ensure your account is fully set up.",
    );
  }

  const currentAddresses: any[] = customerProfile.deliveryAddresses
    ? JSON.parse(JSON.stringify(customerProfile.deliveryAddresses))
    : [];

  if (currentAddresses.length >= 5) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "You've reached the maximum limit of 5 saved addresses. Please remove an old address before adding a new one.",
    );
  }

  // --------------------------------------------------
  // Prevent duplicate address
  // --------------------------------------------------
  const normalize = (value?: string) => value?.trim().toLowerCase() ?? '';
  const isClose = (a?: number, b?: number, tolerance = 0.0001) => {
    if (a == null || b == null) return false;
    return Math.abs(a - b) <= tolerance;
  };
  const isDuplicate = currentUser.deliveryAddresses?.some(
    (addr: TDeliveryAddress) => {
      const textMatch =
        normalize(addr.street) === normalize(deliveryAddress.street) &&
        normalize(addr.city) === normalize(deliveryAddress.city) &&
        normalize(addr.country) === normalize(deliveryAddress.country) &&
        normalize(addr.postalCode) === normalize(deliveryAddress.postalCode);

      const geoMatch =
        isClose(addr.latitude, deliveryAddress.latitude) &&
        isClose(addr.longitude, deliveryAddress.longitude);

      return textMatch || geoMatch;
    },
  );

  if (isDuplicate) {
    throw new AppError(
      httpStatus.CONFLICT,
      'This address is already in your saved list. No need to add it again!',
    );
  }

  const updatedAddresses = currentAddresses.map((addr: any) => ({
    ...addr,
    isActive: false,
  }));
  // --------------------------------------------------
  // Create new active address
  // --------------------------------------------------
  const newDeliveryAddress: TDeliveryAddress = {
    street: deliveryAddress.street.trim(),
    city: deliveryAddress.city.trim(),
    state: deliveryAddress.state?.trim(),
    country: deliveryAddress.country.trim(),
    postalCode: deliveryAddress.postalCode?.trim(),

    longitude: deliveryAddress.longitude,
    latitude: deliveryAddress.latitude,
    geoAccuracy: deliveryAddress.geoAccuracy,
    detailedAddress: deliveryAddress.detailedAddress?.trim(),

    zoneId: deliveryAddress.zoneId ?? undefined,
    notes: deliveryAddress.notes?.trim(),

    isActive: true,
    addressType: deliveryAddress.addressType ?? 'HOME',
  };

  updatedAddresses.push(newDeliveryAddress);

  const updateData: Record<string, any> = {
    deliveryAddresses: updatedAddresses,
    address: { ...newDeliveryAddress },
  };

  if (deliveryAddress.longitude != null && deliveryAddress.latitude != null) {
    updateData.currentSessionLocation = {
      type: 'Point',
      coordinates: [deliveryAddress.longitude, deliveryAddress.latitude],
      geoAccuracy: deliveryAddress.geoAccuracy ?? 0,
      lastLocationUpdate: new Date(),
    };
  }

  await Customer.findByIdAndUpdate(
    currentUser._id,
    { $set: updateData },
    { runValidators: true, new: true },
  );
  return {
    message: 'Delivery address added successfully',
    activeAddress: newDeliveryAddress,
  };
};

// update delivery address
const updateDeliveryAddress = async (
  addressId: string,
  payload: Partial<TDeliveryAddress>,
  currentUser: TCurrentUser,
) => {
  const userId = currentUser.userId;
  const customer = await Customer.findOne({
    userId,
    isDeleted: false,
  });

  if (!customer) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      "We couldn't find this address, or you may not have permission to update it.",
    );
  }

  const currentAddresses: any[] = customer.deliveryAddresses
    ? JSON.parse(JSON.stringify(customer.deliveryAddresses))
    : [];

  const targetAddressIndex = currentAddresses.findIndex(
    (addr: any) => addr._id?.toString() === addressId,
  );

  if (targetAddressIndex === -1) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      'The requested delivery address could not be found.',
    );
  }

  const targetAddress = currentAddresses[targetAddressIndex];
  if (targetAddress.addressType === 'PRIMARY') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'The PRIMARY address is managed automatically via live location and cannot be updated manually.',
    );
  }

  const newLng =
    payload.longitude !== undefined
      ? payload.longitude
      : targetAddress.longitude;
  const newLat =
    payload.latitude !== undefined ? payload.latitude : targetAddress.latitude;

  if (payload.longitude !== undefined || payload.latitude !== undefined) {
    const isDuplicate = currentAddresses.some(
      (addr: any, index: number) =>
        index !== targetAddressIndex &&
        Number(addr.longitude).toFixed(5) === Number(newLng).toFixed(5) &&
        Number(addr.latitude).toFixed(5) === Number(newLat).toFixed(5),
    );

    if (isDuplicate) {
      throw new AppError(
        httpStatus.CONFLICT,
        'An address with these coordinates is already saved in your list.',
      );
    }
  }

  const updatedTargetAddress = {
    ...targetAddress,
    ...payload,
    street:
      typeof payload.street === 'string'
        ? payload.street.trim()
        : targetAddress.street,
    city:
      typeof payload.city === 'string'
        ? payload.city.trim()
        : targetAddress.city,
    country:
      typeof payload.country === 'string'
        ? payload.country.trim()
        : targetAddress.country,
  };

  currentAddresses[targetAddressIndex] = updatedTargetAddress;

  const updateData: Record<string, any> = {
    deliveryAddresses: currentAddresses,
  };

  const updatedCustomer = await Customer.findOneAndUpdate(
    { userId: currentUser.userId },
    { $set: updateData },
    { new: true, runValidators: true },
  );

  return {
    message: 'Delivery address updated successfully',
    updatedAddress: updatedCustomer?.deliveryAddresses?.find(
      (addr: any) => addr._id?.toString() === addressId,
    ),
  };
};

// Active or deactivate delivery address
const toggleDeliveryAddressStatus = async (
  addressId: string,
  currentUser: TCurrentUser,
) => {
  const customer = await Customer.findById(currentUser._id).lean();

  if (!customer) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      'Profile not found. Please try logging in again.',
    );
  }
  const currentAddresses: any[] = customer.deliveryAddresses
    ? JSON.parse(JSON.stringify(customer.deliveryAddresses))
    : [];

  const targetAddressExists = currentAddresses.some(
    (addr: any) => addr._id?.toString() === addressId,
  );

  if (!targetAddressExists) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      "We couldn't find the delivery address you're trying to activate.",
    );
  }

  let selectedActiveAddress: any = null;

  const updatedAddresses = currentAddresses.map((addr: any) => {
    const isTarget = addr._id?.toString() === addressId;

    if (isTarget) {
      selectedActiveAddress = {
        ...addr,
        isActive: true,
      };
      return selectedActiveAddress;
    }

    return {
      ...addr,
      isActive: false,
    };
  });

  const updateData: Record<string, any> = {
    deliveryAddresses: updatedAddresses,
    address: selectedActiveAddress,
  };

  await Customer.findOneAndUpdate(
    { userId: currentUser.userId },
    { $set: updateData },
    { new: true, runValidators: true },
  );

  return {
    success: true,
    message: 'Delivery address changed successfully',
    activeAddress: selectedActiveAddress,
  };
};

// delete delivery address
const deleteDeliveryAddress = async (
  addressId: string,
  currentUser: TCurrentUser,
) => {
  const customer = await Customer.findById(currentUser._id).lean();

  if (!customer) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      'Profile not found. Please try again.',
    );
  }
  const currentAddresses: any[] = customer.deliveryAddresses
    ? JSON.parse(JSON.stringify(customer.deliveryAddresses))
    : [];

  const targetAddress = currentAddresses.find(
    (addr: any) => addr._id?.toString() === addressId,
  );

  if (!targetAddress) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      "The address you're trying to delete doesn't exist.",
    );
  }

  if (targetAddress.isActive) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'You cannot delete your active delivery address. Please set another address as active before deleting this one.',
    );
  }

  if (targetAddress.addressType === 'PRIMARY') {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Your primary address is required and cannot be deleted. Please update it if your details have changed.',
    );
  }

  const remainingAddresses = currentAddresses.filter(
    (addr: any) => addr._id?.toString() !== addressId,
  );

  await Customer.findOneAndUpdate(
    { userId: currentUser.userId },
    { $set: { deliveryAddresses: remainingAddresses } },
    { runValidators: true },
  );

  return null;
};
//get all customers
const getAllCustomersFromDB = async (
  query: Record<string, unknown>,
  currentUser: TCurrentUser,
) => {
  if (currentUser.status !== 'APPROVED') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      `Access denied. Your account status (${currentUser.status.toLowerCase()}) does not allow you to view customer lists.`,
    );
  }

  const customers = new QueryBuilder(Customer.find(), query)
    .search(CustomerSearchableFields)
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
    customers.modelQuery = customers.modelQuery.populate(option);
  });

  const meta = await customers.countTotal();

  const data = await customers.modelQuery;

  return {
    meta,
    data,
  };
};

// get single customer
const getSingleCustomerFromDB = async (
  customerId: string,
  currentUser: TCurrentUser,
) => {
  if (currentUser.status !== 'APPROVED') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      `Access denied. Your account status (${currentUser.status.toLowerCase()}) does not allow you to view this information.`,
    );
  }

  let query: any;
  if (currentUser.role !== 'ADMIN' && currentUser.role !== 'SUPER_ADMIN') {
    query = Customer.findOne({
      userId: currentUser?.userId,
      isDeleted: false,
    });
    if (
      query?.userId !== currentUser?.userId ||
      customerId !== currentUser?.userId
    ) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        "You don't have permission to view this customer's details.",
      );
    }
  } else {
    query = Customer.findOne({
      userId: customerId,
    });
  }

  const populateOptions = getPopulateOptions(currentUser.role, {
    approvedBy: 'name userId role',
    rejectedBy: 'name userId role',
    blockedBy: 'name userId role',
  });

  populateOptions.forEach((option) => {
    query = query?.populate(option);
  });
  const data = await query;
  if (!data) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      'The requested customer profile could not be found.',
    );
  }

  return data;
};

export const CustomerServices = {
  updateCustomer,
  updateCustomerLiveLocation,
  addDeliveryAddress,
  updateDeliveryAddress,
  toggleDeliveryAddressStatus,
  deleteDeliveryAddress,
  getAllCustomersFromDB,
  getSingleCustomerFromDB,
};
