import { QueryBuilder } from '../../builder/QueryBuilder';
import AppError from '../../errors/AppError';
import httpStatus from 'http-status';
import { AuthUser } from '../../constant/user.const';
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
    email: currentUser?.email,
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
  if (!existingCustomer?.isEmailVerified) {
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
    existingCustomer?.deliveryAddresses?.push({
      street: payload?.address?.street || '',
      city: payload?.address?.city || '',
      state: payload?.address?.state || '',
      country: payload?.address?.country || '',
      zipCode: payload?.address?.zipCode || '',
      latitude: payload?.address?.latitude || 0,
      longitude: payload?.address?.longitude || 0,
      isActive: true,
    });
    payload.deliveryAddresses = existingCustomer.deliveryAddresses;
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
    email: currentUser?.email,
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
  const existingCurrentUser = await findUserByEmailOrId({
    email: currentUser?.email,
    isDeleted: false,
  });

  if (existingCurrentUser.user.status !== 'APPROVED') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      `You are not approved to view a customer. Your account is ${existingCurrentUser.user.status}`
    );
  }

  let existingCustomer;
  if (currentUser.role !== 'ADMIN' && currentUser.role !== 'SUPER_ADMIN') {
    existingCustomer = await Customer.isUserExistsByUserId(customerId, false);
  } else {
    existingCustomer = await Customer.isUserExistsByUserId(customerId);
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
