import { QueryBuilder } from '../../builder/QueryBuilder';
import AppError from '../../errors/AppError';
import httpStatus from 'http-status';
import { AuthUser } from '../../constant/user.constant';
import { TCustomer } from './customer.interface';
import { Customer } from './customer.model';
import { CustomerSearchableFields } from './customer.constant';
import { findUserByEmailOrId } from '../../utils/findUserByEmailOrId';

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
        lastUpdate: new Date(),
        isSharingActive: false,
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

  // ----------------------------------------------------------------------
  //  Make sure only ONE active
  // ----------------------------------------------------------------------
  if (payload.deliveryAddresses && payload.deliveryAddresses.length > 0) {
    // Set last item as active (or enforce one active)
    payload.deliveryAddresses = payload.deliveryAddresses.map((addr, idx) => ({
      ...addr,
      isActive: idx === payload.deliveryAddresses!.length - 1,
    }));

    // Auto-update currentSessionLocation from active
    const active = payload.deliveryAddresses.find((a) => a.isActive);

    if (active?.longitude != null && active?.latitude != null) {
      payload.currentSessionLocation = {
        type: 'Point',
        coordinates: [active.longitude, active.latitude],
        accuracy: active.geoAccuracy ?? 0,
        lastUpdate: new Date(),
        isSharingActive: false,
      };
    }
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
        lastUpdate: new Date(),
        isSharingActive: false,
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
  const existingCurrentUser = await findUserByEmailOrId({
    userId: currentUser?.id,
    isDeleted: false,
  });
  if (existingCurrentUser.user.status !== 'APPROVED') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      `You are not approved to view customers. Your account is ${existingCurrentUser.user.status}`
    );
  }

  const customers = new QueryBuilder(Customer.find(), query)
    .fields()
    .paginate()
    .sort()
    .filter()
    .search(CustomerSearchableFields);

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
  const user = result?.user;

  if (user.status !== 'APPROVED') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      `You are not approved to view a customer. Your account is ${user.status}`
    );
  }

  let existingCustomer;
  if (currentUser.role !== 'ADMIN' && currentUser.role !== 'SUPER_ADMIN') {
    existingCustomer = await Customer.findOne({
      userId: user?.userId,
      isDeleted: false,
    });
    if (
      existingCustomer?.userId !== currentUser?.id ||
      customerId !== currentUser?.id
    ) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        'You are not authorized to view this customer'
      );
    }
  } else {
    existingCustomer = await Customer.findOne({
      userId: customerId,
    });
  }
  if (!existingCustomer) {
    throw new AppError(httpStatus.NOT_FOUND, 'Customer not found!');
  }

  return existingCustomer;
};

export const CustomerServices = {
  updateCustomer,
  deleteDeliveryAddress,
  getAllCustomersFromDB,
  getSingleCustomerFromDB,
};
