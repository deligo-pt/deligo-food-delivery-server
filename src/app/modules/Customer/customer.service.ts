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
  profilePhoto: string | undefined
) => {
  const existingCurrentUser = await findUserByEmailOrId({
    userId: currentUser?.id,
    isDeleted: false,
  });

  if (existingCurrentUser.user.status !== 'APPROVED') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      `You are not approved to update a customer. Your account is ${existingCurrentUser.user.status}`
    );
  }

  const existingCustomer = await Customer.isUserExistsByUserId(
    customerId,
    false
  );
  if (!existingCustomer) {
    throw new AppError(httpStatus.NOT_FOUND, 'Customer not found!');
  }
  if (!existingCustomer?.isOtpVerified) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Please verify your email');
  }
  if (
    currentUser?.role === 'CUSTOMER' &&
    currentUser?.id !== existingCustomer?.userId
  ) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'You are not authorized for update'
    );
  }
  if (payload.profilePhoto) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Profile photo should be in file!'
    );
  }
  if (profilePhoto) {
    payload.profilePhoto = profilePhoto;
  }

  if (payload?.address && !payload?.deliveryAddresses) {
    if (!existingCustomer.deliveryAddresses) {
      existingCustomer.deliveryAddresses = [];
    }

    const newAddress = {
      street: payload.address.street || '',
      city: payload.address.city || '',
      state: payload.address.state || '',
      country: payload.address.country || '',
      postalCode: payload.address.postalCode || '',
      latitude: payload.address.latitude || 0,
      longitude: payload.address.longitude || 0,
      geoAccuracy: payload.address.geoAccuracy || 0,
    };

    // ------------------------------------------
    // Check if same address already exists
    // ------------------------------------------
    const isSameAddress = existingCustomer.deliveryAddresses.some(
      (addr) =>
        addr.street === newAddress.street &&
        addr.city === newAddress.city &&
        addr.state === newAddress.state &&
        addr.country === newAddress.country &&
        addr.postalCode === newAddress.postalCode
    );

    if (isSameAddress) {
      // ----------------------------------------------------
      // Do nothing if the address already exists
      // ----------------------------------------------------
      payload.deliveryAddresses = existingCustomer.deliveryAddresses;
    } else {
      // ----------------------------------------------------
      //  Deactivate previously active address
      // ----------------------------------------------------
      existingCustomer.deliveryAddresses =
        existingCustomer.deliveryAddresses.map((addr) => ({
          ...addr,
          isActive: false,
        }));

      // ----------------------------------------------
      // Push new address with isActive = true
      // ----------------------------------------------
      existingCustomer.deliveryAddresses.push({
        ...newAddress,
        isActive: true,
      });

      payload.deliveryAddresses = existingCustomer.deliveryAddresses;
    }
  }

  const updateCustomer = await Customer.findOneAndUpdate(
    { userId: customerId },
    { ...payload },
    {
      new: true,
    }
  );
  return updateCustomer;
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
  getAllCustomersFromDB,
  getSingleCustomerFromDB,
};
