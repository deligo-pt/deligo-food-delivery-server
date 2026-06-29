/* eslint-disable no-unused-vars */
/* eslint-disable @typescript-eslint/no-unused-vars */
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
import { flattenObject } from '../../utils/flattenObject';
import { AuthUser } from '../AuthUser/authUser.model';

// update customer service
const updateCustomer = async (
  payload: Partial<TCustomer>,
  customerId: string,
  currentUser: TCurrentUser,
) => {
  if (currentUser.status !== 'APPROVED') {
    throw new AppError(httpStatus.FORBIDDEN, 'ACCESS_DENIED_ACCOUNT_STATUS', {
      status: currentUser.status,
    });
  }

  const customer = await AuthUser.findOne({
    userId: customerId,
    isDeleted: false,
  }).populate('profileId');

  if (!customer) {
    throw new AppError(httpStatus.NOT_FOUND, 'ACCOUNT_NOT_FOUND');
  }

  if (customer.requiresOtpVerification) {
    throw new AppError(httpStatus.BAD_REQUEST, 'OTP_VERIFICATION_REQUIRED');
  }

  const customerProfile = customer.profileId as any;

  if (!customerProfile) {
    throw new AppError(httpStatus.NOT_FOUND, 'PROFILE_DETAILS_NOT_FOUND');
  }

  if (
    currentUser.role === 'CUSTOMER' &&
    currentUser.userId !== customer.userId
  ) {
    throw new AppError(httpStatus.FORBIDDEN, 'UPDATE_PROFILE_FORBIDDEN');
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

  return {
    messageKey: 'CUSTOMER_UPDATED_SUCCESS' as const,
    data: updated,
  };
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
    throw new AppError(httpStatus.FORBIDDEN, 'LOCATION_UPDATE_STATUS_BLOCKED', {
      status: currentUser?.status,
    });
  }

  if (currentUser?.userId !== customerId) {
    throw new AppError(httpStatus.BAD_REQUEST, 'LOCATION_UPDATE_UNAUTHORIZED');
  }

  const { latitude, longitude, geoAccuracy, isMocked } = payload;

  if (geoAccuracy !== undefined && geoAccuracy > 100) {
    throw new AppError(httpStatus.BAD_REQUEST, 'LOW_LOCATION_ACCURACY');
  }

  const currentSessionLocation: Record<string, any> = {
    type: 'Point',
    coordinates: [longitude, latitude],
    lastLocationUpdate: new Date(),
  };

  if (isMocked !== undefined) {
    currentSessionLocation.isMocked = isMocked;
  }

  const updateData: Record<string, any> = {
    currentSessionLocation,
  };

  const customerExists = await Customer.findOne({ userId: currentUser.userId });
  if (!customerExists) {
    throw new AppError(httpStatus.NOT_FOUND, 'CUSTOMER_PROFILE_NOT_FOUND');
  }

  const hasPrimaryAddress = customerExists.deliveryAddresses?.some(
    (addr: any) => addr.addressType === 'PRIMARY',
  );

  const updateQuery: Record<string, any> = {};
  let arrayFilters: any[] = [];

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
      'deliveryAddresses.$[primaryElem]',
    );

    updateQuery['$set'] = {
      ...updateData,
      ...flattenedAddressFields,
      'deliveryAddresses.$[otherElem].isActive': false,
    };
    arrayFilters = [
      { 'primaryElem.addressType': 'PRIMARY' },
      { 'otherElem.addressType': { $ne: 'PRIMARY' } },
    ];
  } else {
    const updatedExistingAddresses = (
      customerExists.deliveryAddresses || []
    ).map((addr: any) => ({
      ...(addr.toObject?.() || addr),
      isActive: false,
    }));

    const newPrimaryAddress = {
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
    };

    updateQuery['$set'] = {
      ...updateData,
      deliveryAddresses: [...updatedExistingAddresses, newPrimaryAddress],
    };

    arrayFilters = [];
  }

  const updatedCustomer = await Customer.findOneAndUpdate(
    { userId: currentUser.userId },
    updateQuery,
    {
      new: true,
      runValidators: true,
      arrayFilters: arrayFilters.length > 0 ? arrayFilters : undefined,
    },
  );

  if (!updatedCustomer) {
    throw new AppError(httpStatus.NOT_FOUND, 'LOCATION_UPDATE_FAILED');
  }

  return {
    success: true,
    messageKey: 'LIVE_LOCATION_UPDATED_SUCCESS' as const,
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
      'DELIVERY_ADDRESS_FIELDS_REQUIRED',
    );
  }

  if (currentUser?.role !== 'CUSTOMER') {
    throw new AppError(httpStatus.FORBIDDEN, 'ONLY_CUSTOMER_CAN_ADD_ADDRESS');
  }

  const customerProfile = await Customer.findOne({
    userId: currentUser.userId,
  });
  if (!customerProfile) {
    throw new AppError(httpStatus.NOT_FOUND, 'CUSTOMER_PROFILE_SETUP_REQUIRED');
  }

  const currentAddresses: any[] = customerProfile.deliveryAddresses
    ? JSON.parse(JSON.stringify(customerProfile.deliveryAddresses))
    : [];

  if (currentAddresses.length >= 5) {
    throw new AppError(httpStatus.BAD_REQUEST, 'ADDRESS_LIMIT_REACHED');
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
    throw new AppError(httpStatus.CONFLICT, 'ADDRESS_ALREADY_EXISTS');
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
    messageKey: 'DELIVERY_ADDRESS_ADDED_SUCCESS' as const,
    data: newDeliveryAddress,
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
      'UPDATE_ADDRESS_NOT_FOUND_OR_FORBIDDEN',
    );
  }

  const currentAddresses: any[] = customer.deliveryAddresses
    ? JSON.parse(JSON.stringify(customer.deliveryAddresses))
    : [];

  const targetAddressIndex = currentAddresses.findIndex(
    (addr: any) => addr._id?.toString() === addressId,
  );

  if (targetAddressIndex === -1) {
    throw new AppError(httpStatus.NOT_FOUND, 'REQUESTED_ADDRESS_NOT_FOUND');
  }

  const targetAddress = currentAddresses[targetAddressIndex];

  if (
    targetAddress.addressType === 'PRIMARY' &&
    payload.addressType &&
    payload.addressType !== 'PRIMARY'
  ) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'PRIMARY_ADDRESS_TYPE_IMMUTABLE',
    );
  }

  if (
    targetAddress.addressType !== 'PRIMARY' &&
    payload.addressType === 'PRIMARY'
  ) {
    throw new AppError(httpStatus.BAD_REQUEST, 'CANNOT_SET_PRIMARY_MANUALLY');
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
      throw new AppError(httpStatus.CONFLICT, 'ADDRESS_COORDINATES_DUPLICATE');
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
    messageKey: 'DELIVERY_ADDRESS_UPDATED_SUCCESS' as const,
    data: updatedCustomer?.deliveryAddresses?.find(
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
    throw new AppError(httpStatus.NOT_FOUND, 'PROFILE_NOT_FOUND_LOGIN_AGAIN');
  }
  const currentAddresses: any[] = customer.deliveryAddresses
    ? JSON.parse(JSON.stringify(customer.deliveryAddresses))
    : [];

  const targetAddressExists = currentAddresses.some(
    (addr: any) => addr._id?.toString() === addressId,
  );

  if (!targetAddressExists) {
    throw new AppError(httpStatus.NOT_FOUND, 'ACTIVATE_ADDRESS_NOT_FOUND');
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
    messageKey: 'DELIVERY_ADDRESS_CHANGED_SUCCESS' as const,
    data: selectedActiveAddress,
  };
};

// delete delivery address
const deleteDeliveryAddress = async (
  addressId: string,
  currentUser: TCurrentUser,
) => {
  const customer = await Customer.findById(currentUser._id).lean();

  if (!customer) {
    throw new AppError(httpStatus.NOT_FOUND, 'PROFILE_NOT_FOUND_TRY_AGAIN');
  }
  const currentAddresses: any[] = customer.deliveryAddresses
    ? JSON.parse(JSON.stringify(customer.deliveryAddresses))
    : [];

  const targetAddress = currentAddresses.find(
    (addr: any) => addr._id?.toString() === addressId,
  );

  if (!targetAddress) {
    throw new AppError(httpStatus.NOT_FOUND, 'DELETE_ADDRESS_NOT_FOUND');
  }

  if (targetAddress.isActive) {
    throw new AppError(httpStatus.BAD_REQUEST, 'CANNOT_DELETE_ACTIVE_ADDRESS');
  }

  if (targetAddress.addressType === 'PRIMARY') {
    throw new AppError(httpStatus.BAD_REQUEST, 'CANNOT_DELETE_PRIMARY_ADDRESS');
  }

  const remainingAddresses = currentAddresses.filter(
    (addr: any) => addr._id?.toString() !== addressId,
  );

  await Customer.findOneAndUpdate(
    { userId: currentUser.userId },
    { $set: { deliveryAddresses: remainingAddresses } },
    { runValidators: true },
  );

  return {
    messageKey: 'DELIVERY_ADDRESS_DELETED_SUCCESS' as const,
    data: null,
  };
};
//get all customers
const getAllCustomersFromDB = async (
  query: Record<string, unknown>,
  currentUser: TCurrentUser,
) => {
  if (currentUser.status !== 'APPROVED') {
    throw new AppError(httpStatus.FORBIDDEN, 'VIEW_CUSTOMER_LIST_FORBIDDEN', {
      status: currentUser.status,
    });
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
    messageKey: 'CUSTOMERS_RETRIEVED_SUCCESS' as const,
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
    throw new AppError(httpStatus.FORBIDDEN, 'VIEW_CUSTOMER_INFO_FORBIDDEN', {
      status: currentUser.status,
    });
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
        'VIEW_CUSTOMER_DETAILS_FORBIDDEN',
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
    throw new AppError(httpStatus.NOT_FOUND, 'REQUESTED_CUSTOMER_NOT_FOUND');
  }

  return {
    messageKey: 'CUSTOMER_RETRIEVED_SUCCESS' as const,
    data,
  };
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
