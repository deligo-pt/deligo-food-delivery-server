/* eslint-disable @typescript-eslint/no-explicit-any */
import { QueryBuilder } from '../../builder/QueryBuilder';
import AppError from '../../errors/AppError';
import httpStatus from 'http-status';
import { AuthUser } from '../../constant/user.constant';
import { TCustomer } from './customer.interface';
import { Customer } from './customer.model';
import { CustomerSearchableFields } from './customer.constant';
import { findUserByEmailOrId } from '../../utils/findUserByEmailOrId';
import { TDeliveryAddress } from '../../constant/address.constant';
import { getPopulateOptions } from '../../utils/getPopulateOptions';

// update customer service
const updateCustomer = async (
  payload: Partial<TCustomer>,
  customerId: string,
  currentUser: AuthUser,
  profilePhoto?: string
) => {
  // ----------------------------------------------------------------------
  // Authorization
  // ----------------------------------------------------------------------
  const userRecord = await findUserByEmailOrId({
    userId: currentUser?.id,
    isDeleted: false,
  });

  if (userRecord.user.status !== 'APPROVED') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      `You cannot update profile. Status: ${userRecord.user.status}`
    );
  }

  const customer = await Customer.isUserExistsByUserId(customerId, false);
  if (!customer) throw new AppError(httpStatus.NOT_FOUND, 'Customer not found');
  if (!customer.isOtpVerified)
    throw new AppError(httpStatus.BAD_REQUEST, 'Please verify your email');

  if (currentUser.role === 'CUSTOMER' && currentUser.id !== customer.userId) {
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
    const { longitude, latitude, geoAccuracy } = payload.address;

    // Auto-update location if coords provided
    if (longitude != null && latitude != null) {
      payload.currentSessionLocation = {
        type: 'Point',
        coordinates: [longitude, latitude],
        accuracy: geoAccuracy ?? 0,
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
        addr.latitude === newAddress.latitude
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

  // -----------------------------------------------------------------------
  //  update operational address
  // -----------------------------------------------------------------------
  if (payload.operationalAddress) {
    const { longitude, latitude, geoAccuracy } = payload.operationalAddress;
    // Auto-update location if coords provided
    if (longitude != null && latitude != null) {
      payload.currentSessionLocation = {
        type: 'Point',
        coordinates: [longitude, latitude],
        accuracy: geoAccuracy ?? 0,
        lastLocationUpdate: new Date(),
      };
    }
    const newAddress = {
      ...payload.operationalAddress,
    };

    await Customer.findOneAndUpdate(
      { userId: customerId },
      { $set: { operationalAddress: newAddress } },
      { new: true }
    );
  }

  // ----------------------------------------------------------------------
  // Final Update
  // ----------------------------------------------------------------------
  const updated = await Customer.findOneAndUpdate(
    { userId: customerId },
    { $set: payload },
    { new: true }
  );

  return updated;
};

// --------------------------------------------------------------
// Delivery address service will be added here
// --------------------------------------------------------------
const addDeliveryAddress = async (
  deliveryAddress: TDeliveryAddress,
  currentUser: AuthUser
) => {
  // --------------------------------------------------
  // Authorization
  // --------------------------------------------------
  await findUserByEmailOrId({
    userId: currentUser.id,
    isDeleted: false,
  });

  const userId = currentUser.id;

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
      'Street, city and country are required'
    );
  }

  const customer = await Customer.findOne({ userId }, { deliveryAddresses: 1 });

  if (!customer) {
    throw new AppError(httpStatus.NOT_FOUND, 'Customer not found');
  }

  if (customer.deliveryAddresses!.length >= 5) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'You have reached the maximum number of delivery addresses'
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
  const isDuplicate = customer.deliveryAddresses?.some((addr) => {
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
      'This delivery address already exists'
    );
  }

  const hasAnyAddress = (customer.deliveryAddresses?.length ?? 0) > 0;

  // --------------------------------------------------
  // Deactivate previous addresses
  // --------------------------------------------------
  await Customer.updateOne(
    { userId },
    { $set: { 'deliveryAddresses.$[].isActive': false } }
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

    zoneId: deliveryAddress.zoneId ?? undefined,
    notes: deliveryAddress.notes?.trim(),

    isActive: true,
    addressType: hasAnyAddress ? deliveryAddress.addressType : 'PRIMARY',
  };

  // --------------------------------------------------
  // Push address
  // --------------------------------------------------
  await Customer.updateOne(
    { userId },
    { $push: { deliveryAddresses: newDeliveryAddress } }
  );

  const { longitude, latitude, geoAccuracy } = newDeliveryAddress;

  // Auto-update location if coords provided
  if (longitude != null && latitude != null) {
    customer.currentSessionLocation = {
      type: 'Point',
      coordinates: [longitude, latitude],
      accuracy: geoAccuracy ?? 0,
      lastLocationUpdate: new Date(),
    };
  }
  await customer.save();

  return {
    message: 'Delivery address added successfully',
    activeAddress: newDeliveryAddress,
  };
};

// Active or deactivate delivery address
const toggleDeliveryAddressStatus = async (
  addressId: string,
  currentUser: AuthUser
) => {
  const result = await findUserByEmailOrId({
    userId: currentUser.id,
    isDeleted: false,
  });
  const loggedInUser = result?.user;
  await Customer.updateOne(
    { userId: loggedInUser.userId },
    { $set: { 'deliveryAddresses.$[].isActive': false } }
  );

  const updatedCustomer = await Customer.findOneAndUpdate(
    { userId: loggedInUser.userId, 'deliveryAddresses._id': addressId },
    { $set: { 'deliveryAddresses.$.isActive': true } },
    { new: true }
  );
  const updatedAddress = updatedCustomer?.deliveryAddresses?.find(
    (addr) => addr.isActive === true
  );
  const { longitude, latitude, geoAccuracy } = updatedAddress!;

  // Auto-update location if coords provided
  if (longitude != null && latitude != null) {
    loggedInUser.currentSessionLocation = {
      type: 'Point',
      coordinates: [longitude, latitude],
      accuracy: geoAccuracy ?? 0,
      lastUpdate: new Date(),
      isSharingActive: false,
    };
  }
  await loggedInUser.save();
  return {
    message: 'Delivery address status updated successfully',
  };
};

// delete delivery address
const deleteDeliveryAddress = async (
  addressId: string,
  currentUser: AuthUser
) => {
  await findUserByEmailOrId({ userId: currentUser.id, isDeleted: false });
  const userId = currentUser.id;
  const result = await Customer.findOne(
    { userId },
    { deliveryAddresses: { $elemMatch: { _id: addressId } } }
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
      'Primary address cannot be deleted'
    );
  }
  await Customer.updateOne(
    { userId },
    { $pull: { deliveryAddresses: { _id: addressId } } }
  );
  return null;
};

//get all customers
const getAllCustomersFromDB = async (
  query: Record<string, unknown>,
  currentUser: AuthUser
) => {
  const result = await findUserByEmailOrId({
    userId: currentUser?.id,
    isDeleted: false,
  });

  const loggedInUser = result?.user;

  if (loggedInUser.status !== 'APPROVED') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      `You are not approved to view customers. Your account is ${loggedInUser.status}`
    );
  }

  const customers = new QueryBuilder(Customer.find(), query)
    .fields()
    .paginate()
    .sort()
    .filter()
    .search(CustomerSearchableFields);

  const populateOptions = getPopulateOptions(loggedInUser.role, {
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
  currentUser: AuthUser
) => {
  const result = await findUserByEmailOrId({
    userId: currentUser?.id,
    isDeleted: false,
  });
  const loggedInUser = result?.user;

  if (loggedInUser.status !== 'APPROVED') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      `You are not approved to view a customer. Your account is ${loggedInUser.status}`
    );
  }

  let query: any;
  if (currentUser.role !== 'ADMIN' && currentUser.role !== 'SUPER_ADMIN') {
    query = Customer.findOne({
      userId: loggedInUser?.userId,
      isDeleted: false,
    });
    if (query?.userId !== currentUser?.id || customerId !== currentUser?.id) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        'You are not authorized to view this customer'
      );
    }
  } else {
    query = Customer.findOne({
      userId: customerId,
    });
  }

  const populateOptions = getPopulateOptions(loggedInUser.role, {
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
  addDeliveryAddress,
  toggleDeliveryAddressStatus,
  deleteDeliveryAddress,
  getAllCustomersFromDB,
  getSingleCustomerFromDB,
};
