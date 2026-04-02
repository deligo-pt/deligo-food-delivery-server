/* eslint-disable @typescript-eslint/no-explicit-any */
import { QueryBuilder } from '../../builder/QueryBuilder';
import AppError from '../../errors/AppError';
import httpStatus from 'http-status';
import { AuthUser } from '../../constant/user.constant';
import { TCustomer } from './customer.interface';
import { Customer } from './customer.model';
import { CustomerSearchableFields } from './customer.constant';
import { TDeliveryAddress } from '../../constant/address.constant';
import { getPopulateOptions } from '../../utils/getPopulateOptions';
import { TLiveLocationPayload } from '../../constant/GlobalInterface/global.interface';

// update customer service
const updateCustomer = async (
  payload: Partial<TCustomer>,
  customerId: string,
  currentUser: AuthUser,
  profilePhoto?: string,
) => {
  if (currentUser.status !== 'APPROVED') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      `You cannot update profile. Status: ${currentUser.status}`,
    );
  }

  const customer = await Customer.isUserExistsByUserId(customerId, false);
  if (!customer) throw new AppError(httpStatus.NOT_FOUND, 'Customer not found');
  if (!customer.isOtpVerified)
    throw new AppError(httpStatus.BAD_REQUEST, 'Please verify your email');

  if (
    currentUser.role === 'CUSTOMER' &&
    currentUser.userId !== customer.userId
  ) {
    throw new AppError(httpStatus.FORBIDDEN, 'Unauthorized update');
  }

  // ----------------------------------------------------------------------
  // Photo update
  // ----------------------------------------------------------------------
  if (payload.profilePhoto) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Photo must be a file upload');
  }

  if (profilePhoto) payload.profilePhoto = profilePhoto;

  // ----------------------------------------------------------------------
  // User sends a single address
  // ----------------------------------------------------------------------
  let updatedDeliveryAddresses = customer.deliveryAddresses;

  if (payload.address) {
    const { longitude, latitude, geoAccuracy = 0 } = payload.address;

    if (geoAccuracy !== undefined && geoAccuracy > 100) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'Geo accuracy must be less than or equal to 100.',
      );
    }

    const hasLng = typeof longitude === 'number';
    const hasLat = typeof latitude === 'number';

    if (hasLng && hasLat) {
      payload.currentSessionLocation = {
        type: 'Point',
        coordinates: [longitude, latitude],
        geoAccuracy: geoAccuracy,
        lastLocationUpdate: new Date(),
      };
    }

    const newAddress = {
      ...payload.address,
      isActive: true,
    };

    // Check if this address already exists
    const exists = customer?.deliveryAddresses?.some(
      (addr) =>
        addr.longitude === newAddress.longitude &&
        addr.latitude === newAddress.latitude,
    );

    if (!exists) {
      // Deactivate all previous addresses
      updatedDeliveryAddresses = customer?.deliveryAddresses?.map((addr) => ({
        ...addr,
        isActive: false,
      }));

      // Add new active address
      updatedDeliveryAddresses?.push({ ...newAddress, addressType: 'PRIMARY' });
    }

    payload.deliveryAddresses = updatedDeliveryAddresses;
  }

  // ----------------------------------------------------------------------
  // Final Update
  // ----------------------------------------------------------------------
  const updated = await Customer.findOneAndUpdate(
    { userId: customerId },
    { $set: payload },
    { new: true },
  );

  return updated;
};

// --------------------------------------------------------------
// Customer live location update service will be added here
// --------------------------------------------------------------
const updateCustomerLiveLocation = async (
  payload: TLiveLocationPayload,
  currentUser: AuthUser,
  customerId: string,
) => {
  if (currentUser?.status !== 'APPROVED') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      `You are not approved to update live location. Your account status is: ${currentUser?.status}`,
    );
  }

  if (currentUser?.userId !== customerId) {
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

  const updatedCustomer = await Customer.findOneAndUpdate(
    { userId: currentUser.userId },
    { $set: updateData },
    {
      new: true,
      runValidators: true,
    },
  );

  if (!updatedCustomer) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      'Customer not found or update failed.',
    );
  }

  return {
    success: true,
    message: 'Live location updated successfully',
    data: updatedCustomer.currentSessionLocation,
  };
};

// --------------------------------------------------------------
// Delivery address service will be added here
// --------------------------------------------------------------
const addDeliveryAddress = async (
  deliveryAddress: TDeliveryAddress,
  currentUser: AuthUser,
) => {
  // --------------------------------------------------
  // Validate payload
  // --------------------------------------------------
  if (
    !deliveryAddress.street?.trim() ||
    !deliveryAddress.city?.trim() ||
    !deliveryAddress.country?.trim()
  ) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Street, city and country are required',
    );
  }

  if (currentUser?.role !== 'CUSTOMER') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'Only customers can add delivery addresses',
    );
  }
  const userId = currentUser.userId;
  if (currentUser.deliveryAddresses!.length >= 5) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'You have reached the maximum number of delivery addresses',
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
  const isDuplicate = currentUser.deliveryAddresses?.some((addr) => {
    const textMatch =
      normalize(addr.street) === normalize(deliveryAddress.street) &&
      normalize(addr.city) === normalize(deliveryAddress.city) &&
      normalize(addr.country) === normalize(deliveryAddress.country) &&
      normalize(addr.postalCode) === normalize(deliveryAddress.postalCode);

    const geoMatch =
      isClose(addr.latitude, deliveryAddress.latitude) &&
      isClose(addr.longitude, deliveryAddress.longitude);

    return textMatch || geoMatch;
  });

  if (isDuplicate) {
    throw new AppError(
      httpStatus.CONFLICT,
      'This delivery address already exists',
    );
  }

  const hasAnyAddress = (currentUser.deliveryAddresses?.length ?? 0) > 0;

  // --------------------------------------------------
  // Deactivate previous addresses
  // --------------------------------------------------
  await Customer.updateOne(
    { userId },
    { $set: { 'deliveryAddresses.$[].isActive': false } },
  );

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
    addressType: hasAnyAddress ? deliveryAddress.addressType : 'OTHER',
  };

  // --------------------------------------------------
  // Push address
  // --------------------------------------------------
  await Customer.updateOne(
    { userId },
    { $push: { deliveryAddresses: newDeliveryAddress } },
  );

  const { longitude, latitude, geoAccuracy = 0 } = newDeliveryAddress;

  // Auto-update location if coords provided
  if (longitude != null && latitude != null) {
    currentUser.currentSessionLocation = {
      type: 'Point',
      coordinates: [longitude, latitude],
      geoAccuracy,
      lastLocationUpdate: new Date(),
    };
  }
  await (currentUser as any).save();

  return {
    message: 'Delivery address added successfully',
    activeAddress: newDeliveryAddress,
  };
};

// update delivery address
const updateDeliveryAddress = async (
  addressId: string,
  payload: Partial<TDeliveryAddress>,
  currentUser: AuthUser,
) => {
  const userId = currentUser.userId;
  const customer = await Customer.findOne({
    userId,
    'deliveryAddresses._id': addressId,
  });

  if (!customer) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      'Address not found or unauthorized',
    );
  }

  const existingAddress = customer.deliveryAddresses?.find(
    (addr) => addr._id?.toString() === addressId,
  );

  if (!existingAddress) {
    throw new AppError(httpStatus.NOT_FOUND, 'Delivery address not found');
  }

  const updateFields: any = {};
  const fieldsToUpdate = [
    'street',
    'city',
    'state',
    'country',
    'postalCode',
    'latitude',
    'longitude',
    'geoAccuracy',
    'detailedAddress',
    'zoneId',
    'notes',
    'addressType',
  ];

  fieldsToUpdate.forEach((field) => {
    if (payload[field as keyof TDeliveryAddress] !== undefined) {
      const val = payload[field as keyof TDeliveryAddress];
      updateFields[`deliveryAddresses.$.${field}`] =
        typeof val === 'string' ? val.trim() : val;
    }
  });
  const updateResult = await Customer.updateOne(
    { userId, 'deliveryAddresses._id': addressId },
    { $set: updateFields },
    { runValidators: true },
  );

  if (updateResult.matchedCount === 0) {
    throw new AppError(httpStatus.INTERNAL_SERVER_ERROR, 'Update failed');
  }

  return {
    message: 'Delivery address updated successfully',
    updatedAddress: { ...existingAddress, ...payload },
  };
};

// Active or deactivate delivery address
const toggleDeliveryAddressStatus = async (
  addressId: string,
  currentUser: AuthUser,
) => {
  const userId = currentUser.userId;
  await Customer.updateOne(
    { userId },
    { $set: { 'deliveryAddresses.$[].isActive': false } },
  );

  const updatedCustomer = await Customer.findOneAndUpdate(
    { userId, 'deliveryAddresses._id': addressId },
    { $set: { 'deliveryAddresses.$.isActive': true } },
    { new: true },
  );
  const updatedAddress = updatedCustomer?.deliveryAddresses?.find(
    (addr) => addr.isActive === true,
  );
  const { longitude, latitude, geoAccuracy = 0 } = updatedAddress!;

  // Auto-update location if coords provided
  if (longitude != null && latitude != null) {
    currentUser.currentSessionLocation = {
      type: 'Point',
      coordinates: [longitude, latitude],
      geoAccuracy,
      lastLocationUpdate: new Date(),
    };
  }
  await (currentUser as any).save();
  return {
    message: 'Delivery address status updated successfully',
  };
};

// delete delivery address
const deleteDeliveryAddress = async (
  addressId: string,
  currentUser: AuthUser,
) => {
  const userId = currentUser.userId;
  const result = await Customer.findOne(
    { userId },
    { deliveryAddresses: { $elemMatch: { _id: addressId } } },
  );

  if (result?.deliveryAddresses?.length === 0) {
    throw new AppError(httpStatus.NOT_FOUND, 'Delivery address not found');
  }
  if (
    result &&
    result?.deliveryAddresses &&
    result?.deliveryAddresses[0].addressType === 'PRIMARY'
  ) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Primary address cannot be deleted',
    );
  }
  await Customer.updateOne(
    { userId },
    { $pull: { deliveryAddresses: { _id: addressId } } },
  );
  return null;
};

//get all customers
const getAllCustomersFromDB = async (
  query: Record<string, unknown>,
  currentUser: AuthUser,
) => {
  if (currentUser.status !== 'APPROVED') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      `You are not approved to view customers. Your account is ${currentUser.status}`,
    );
  }

  const customers = new QueryBuilder(Customer.find(), query)
    .fields()
    .paginate()
    .sort()
    .filter()
    .search(CustomerSearchableFields);

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
  currentUser: AuthUser,
) => {
  if (currentUser.status !== 'APPROVED') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      `You are not approved to view a customer. Your account is ${currentUser.status}`,
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
        'You are not authorized to view this customer',
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
    throw new AppError(httpStatus.NOT_FOUND, 'Customer not found!');
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
