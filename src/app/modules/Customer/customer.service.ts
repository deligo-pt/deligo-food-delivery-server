/* eslint-disable @typescript-eslint/no-explicit-any */
import { QueryBuilder } from '../../builder/QueryBuilder';
import AppError from '../../errors/AppError';
import httpStatus from 'http-status';
import { TCustomer } from './customer.interface';
import { Customer } from './customer.model';
import { CustomerSearchableFields } from './customer.constant';
import { TDeliveryAddress } from '../../constant/GlobalInterface/address.interface';
import { getPopulateOptions } from '../../utils/getPopulateOptions';
import { generateReferralCode } from '../../utils/generateReferralCode';
import { TLiveLocationPayload } from '../../constant/GlobalInterface/location.interface';
import { TAuthUser } from '../AuthUser/authUser.interface';
import { flattenObject } from '../../utils/flattenObject';
import mongoose from 'mongoose';
import { AuthUser } from '../AuthUser/authUser.model';

// update customer service
const updateCustomer = async (
  payload: Partial<TCustomer>,
  customerId: string,
  currentUser: any,
) => {
  if (currentUser.status !== 'APPROVED') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      `You cannot update profile. Status: ${currentUser.status}`,
    );
  }

  const customer = await Customer.findOne({ userId: customerId })
    .lean()
    .select('userId deliveryAddresses referralCode');
  if (!customer) {
    throw new AppError(httpStatus.NOT_FOUND, 'Customer profile not found');
  }

  if (
    currentUser.role === 'CUSTOMER' &&
    currentUser.userId !== customer.userId
  ) {
    throw new AppError(httpStatus.FORBIDDEN, 'Unauthorized update');
  }

  // -----------------------------
  // Referral Code Generation (New Logic)
  // -----------------------------
  if (!customer.referralCode) {
    const firstName =
      payload.name?.firstName || customer?.name?.firstName || 'CUSTOMER';
    const newReferralCode = await generateReferralCode(firstName);

    payload.referralCode = newReferralCode;
  }

  // ----------------------------------------------------------------------
  // User sends a single address
  // ----------------------------------------------------------------------

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

    const currentAddresses = customer.deliveryAddresses
      ? JSON.parse(JSON.stringify(customer.deliveryAddresses))
      : [];
    if (currentAddresses.length >= 5) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'You have reached the maximum number of delivery addresses. Please delete an address to update this one.',
      );
    }

    const existingAddressIndex = currentAddresses.findIndex(
      (addr: any) =>
        Number(addr.longitude).toFixed(5) === Number(longitude).toFixed(5) &&
        Number(addr.latitude).toFixed(5) === Number(latitude).toFixed(5),
    );

    if (existingAddressIndex !== -1) {
      payload.deliveryAddresses = currentAddresses.map(
        (addr: any, index: number) => {
          const isTarget = index === existingAddressIndex;
          return {
            ...(isTarget ? { ...addr, ...payload.address } : addr),
            isActive: isTarget,
            addressType: isTarget ? 'PRIMARY' : 'SECONDARY',
          };
        },
      );
    } else {
      const deactivatedAddresses = currentAddresses.map((addr: any) => ({
        ...addr,
        isActive: false,
        addressType: 'SECONDARY',
      }));

      deactivatedAddresses.push({
        ...payload.address,
        isActive: true,
        addressType: 'PRIMARY',
      });

      payload.deliveryAddresses = deactivatedAddresses;
    }
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
  payload: TLiveLocationPayload,
  currentUser: TAuthUser,
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
  currentUser: TAuthUser,
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

  const customer = await Customer.findById(currentUser.userObjectId)
    .lean()
    .select('deliveryAddresses');

  if (!customer) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Customer not found');
  }

  const currentAddresses: any[] = customer.deliveryAddresses
    ? JSON.parse(JSON.stringify(customer.deliveryAddresses))
    : [];

  if (currentAddresses.length >= 5) {
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

  const isDuplicate = currentAddresses.some((addr: any) => {
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
      'This delivery address already exists in your address book',
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

  await Customer.findOneAndUpdate(
    { userId: currentUser.userId },
    { $set: updateData },
    { runValidators: true },
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
  currentUser: TAuthUser,
) => {
  const customer = await Customer.findById(currentUser.userObjectId)
    .lean()
    .select('deliveryAddresses');

  if (!customer) {
    throw new AppError(httpStatus.NOT_FOUND, 'Customer profile not found');
  }

  const currentAddresses: any[] = customer.deliveryAddresses
    ? JSON.parse(JSON.stringify(customer.deliveryAddresses))
    : [];

  const targetAddressIndex = currentAddresses.findIndex(
    (addr: any) => addr._id?.toString() === addressId,
  );

  if (targetAddressIndex === -1) {
    throw new AppError(httpStatus.NOT_FOUND, 'Delivery address not found');
  }

  const targetAddress = currentAddresses[targetAddressIndex];

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
        'Another delivery address already exists with these GPS coordinates',
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
  currentUser: TAuthUser,
) => {
  if (currentUser?.role !== 'CUSTOMER') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'Only customers can toggle delivery address status',
    );
  }

  const customer = await Customer.findById(currentUser.userObjectId)
    .lean()
    .select('deliveryAddresses');

  if (!customer) {
    throw new AppError(httpStatus.NOT_FOUND, 'Customer profile not found');
  }

  const currentAddresses: any[] = customer.deliveryAddresses
    ? JSON.parse(JSON.stringify(customer.deliveryAddresses))
    : [];

  const targetAddressExists = currentAddresses.some(
    (addr: any) => addr._id?.toString() === addressId,
  );

  if (!targetAddressExists) {
    throw new AppError(httpStatus.NOT_FOUND, 'Delivery address not found');
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
  currentUser: TAuthUser,
) => {
  const customer = await Customer.findById(currentUser.userObjectId)
    .lean()
    .select('deliveryAddresses');

  if (!customer) {
    throw new AppError(httpStatus.NOT_FOUND, 'Customer profile not found');
  }

  const currentAddresses: any[] = customer.deliveryAddresses
    ? JSON.parse(JSON.stringify(customer.deliveryAddresses))
    : [];

  const targetAddress = currentAddresses.find(
    (addr: any) => addr._id?.toString() === addressId,
  );

  if (!targetAddress) {
    throw new AppError(httpStatus.NOT_FOUND, 'Delivery address not found');
  }

  if (targetAddress.isActive) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Your currently active delivery address cannot be deleted. Please switch to another address first.',
    );
  }

  if (targetAddress.addressType === 'PRIMARY') {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Your PRIMARY address is locked and cannot be deleted.',
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
  currentUser: TAuthUser,
) => {
  if (currentUser.status !== 'APPROVED') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      `You are not approved to view customers. Your account is ${currentUser.status}`,
    );
  }

  if (currentUser.role === 'CUSTOMER') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'Unauthorized access. Customers cannot view the customer list.',
    );
  }

  const customersQuery = new QueryBuilder(Customer.find().lean(), query)
    .search(CustomerSearchableFields)
    .filter()
    .sort()
    .paginate()
    .fields();

  customersQuery.modelQuery = customersQuery.modelQuery.populate([
    {
      path: 'approvedBy rejectedBy blockedBy',
      select: 'name userId role',
    },
  ]);

  const meta = await customersQuery.countTotal();
  const rawCustomersData = await customersQuery.modelQuery;

  const userIds = rawCustomersData.map((customer: any) => customer.userId);
  const authUsersList = await AuthUser.find({ userId: { $in: userIds } })
    .select(
      'role status isOtpVerified isDeleted requiresOtpVerification contactNumber twoFactorEnabled loginDevices paymentMethods',
    )
    .lean();

  const authMap = new Map(authUsersList.map((user) => [user.userId, user]));

  const fullCustomersList = rawCustomersData.map((customerDoc: any) => {
    const authInfo = authMap.get(customerDoc.userId);

    return {
      ...customerDoc,
      ...(authInfo || {}),
    };
  });

  return {
    meta,
    data: fullCustomersList,
  };
};

// get single customer
const getSingleCustomerFromDB = async (
  customerId: string,
  currentUser: TAuthUser,
) => {
  if (currentUser.status !== 'APPROVED') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      `You are not approved to view customer details. Status: ${currentUser.status}`,
    );
  }

  let customerData: any = null;

  const isAdminOrStaff = ['ADMIN', 'SUPER_ADMIN', 'STAFF'].includes(
    currentUser.role,
  );

  if (!isAdminOrStaff) {
    if (String(customerId) !== String(currentUser.userId)) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        'Unauthorized access. You can only view your own profile.',
      );
    }

    customerData = await Customer.findOne({ userId: customerId }).lean();
  } else {
    let query = Customer.findOne({ userId: customerId });

    const populateOptions = getPopulateOptions(currentUser.role, {
      approvedBy: 'name userId role',
      rejectedBy: 'name userId role',
      blockedBy: 'name userId role',
    });

    populateOptions.forEach((option) => {
      query = query.populate(option);
    });

    customerData = await query;
  }

  if (!customerData) {
    throw new AppError(httpStatus.NOT_FOUND, 'Customer profile not found!');
  }

  const customer = customerData.toObject
    ? customerData.toObject()
    : JSON.parse(JSON.stringify(customerData));

  const authInfo = await AuthUser.findOne({ userId: customer.userId })
    .select(
      'role status isOtpVerified isDeleted requiresOtpVerification contactNumber twoFactorEnabled loginDevices paymentMethods',
    )
    .lean();

  return {
    ...customer,
    ...(authInfo || {}),
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
