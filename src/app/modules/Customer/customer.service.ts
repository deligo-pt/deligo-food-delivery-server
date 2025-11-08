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
  await findUserByEmailOrId({
    email: currentUser?.email,
    isDeleted: false,
  });

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
  if (profilePhoto) {
    payload.profilePhoto = profilePhoto;
  }
  const updateCustomer = await Customer.findOneAndUpdate(
    { userId: customerId },
    payload,
    {
      new: true,
    }
  );
  return updateCustomer;
};

//get all customers
const getAllCustomersFromDB = async (query: Record<string, unknown>) => {
  const customers = new QueryBuilder(Customer.find(), query)
    .fields()
    .paginate()
    .sort()
    .filter()
    .search(CustomerSearchableFields);

  const result = await customers.modelQuery;

  return result;
};

// get single customer
const getSingleCustomerFromDB = async (
  customerId: string,
  currentUser: AuthUser
) => {
  await findUserByEmailOrId({
    email: currentUser?.email,
    isDeleted: true,
  });

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
