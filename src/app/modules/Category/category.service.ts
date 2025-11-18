import httpStatus from 'http-status';
import AppError from '../../errors/AppError';
import { BusinessCategory, ProductCategory } from './category.model';
import { TBusinessCategory, TProductCategory } from './category.interface';
import { AuthUser } from '../../constant/user.const';
import { findUserByEmailOrId } from '../../utils/findUserByEmailOrId';
import { QueryBuilder } from '../../builder/QueryBuilder';

//  Create Business Category
const createBusinessCategory = async (
  payload: TBusinessCategory,
  currentUser: AuthUser
) => {
  await findUserByEmailOrId({ userId: currentUser.id, isDeleted: false });

  const exists = await BusinessCategory.findOne({ name: payload.name });
  if (exists) {
    throw new AppError(httpStatus.CONFLICT, 'Business category already exists');
  }

  // generate slug
  payload.slug = payload.name
    .toLowerCase()
    .replace(/[^\w ]+/g, '')
    .replace(/ +/g, '-');

  const category = await BusinessCategory.create({ ...payload });
  return category;
};

//  Get All Business Categories
const getAllBusinessCategories = async (
  query: Record<string, unknown>,
  currentUser: AuthUser
) => {
  await findUserByEmailOrId({ userId: currentUser.id, isDeleted: false });
  if (currentUser.role !== 'ADMIN' && currentUser.role !== 'SUPER_ADMIN') {
    (query.isActive = true), (query.isDeleted = false);
  }
  const businessCategories = new QueryBuilder(BusinessCategory.find(), query)
    .fields()
    .paginate()
    .sort()
    .filter()
    .search(['name', 'slug']);

  const meta = await businessCategories.countTotal();
  const data = await businessCategories.modelQuery;
  return { meta, data };
};

//  Get Single Business Category
const getSingleBusinessCategory = async (id: string, currentUser: AuthUser) => {
  await findUserByEmailOrId({ userId: currentUser.id, isDeleted: false });
  const category = await BusinessCategory.findById(id);
  if (!category) {
    throw new AppError(httpStatus.NOT_FOUND, 'Business category not found');
  }

  if (
    (currentUser.role === 'VENDOR' || currentUser.role === 'FLEET_MANAGER') &&
    category.isActive === false
  ) {
    throw new AppError(httpStatus.NOT_FOUND, 'Business category not found');
  }

  return category;
};

//  Update Business Category
const updateBusinessCategory = async (
  id: string,
  payload: Partial<TBusinessCategory>,
  currentUser: AuthUser
) => {
  await findUserByEmailOrId({ userId: currentUser.id, isDeleted: false });
  if (payload.name)
    payload.slug = payload.name
      .toLowerCase()
      .replace(/[^\w ]+/g, '')
      .replace(/ +/g, '-');
  const category = await BusinessCategory.findById(id);
  if (!category) {
    throw new AppError(httpStatus.NOT_FOUND, 'Business category not found');
  }

  if (payload?.isActive === category.isActive) {
    throw new AppError(
      httpStatus.CONFLICT,
      `Business category is already ${category.isActive}`
    );
  }

  Object.assign(category, payload);
  await category.save();
  return category;
};

// Soft Delete Business Category
const softDeleteBusinessCategory = async (
  id: string,
  currentUser: AuthUser
) => {
  await findUserByEmailOrId({ userId: currentUser.id, isDeleted: false });
  const category = await BusinessCategory.findById(id);
  if (!category)
    throw new AppError(httpStatus.NOT_FOUND, 'Business category not found');
  if (category.isDeleted === true) {
    throw new AppError(
      httpStatus.CONFLICT,
      'Business category already deleted'
    );
  }

  if (category.isActive) {
    throw new AppError(
      httpStatus.CONFLICT,
      'Business category is active, cannot delete'
    );
  }

  category.isDeleted = true;
  await category.save();
  return {
    message: 'Business category deleted successfully',
  };
};

// Permanent Delete Business Category
const permanentDeleteBusinessCategory = async (
  id: string,
  currentUser: AuthUser
) => {
  await findUserByEmailOrId({ userId: currentUser.id, isDeleted: false });
  const category = await BusinessCategory.findById(id);
  if (!category) {
    throw new AppError(httpStatus.NOT_FOUND, 'Business category not found');
  }
  if (category.isDeleted === false) {
    throw new AppError(httpStatus.CONFLICT, 'Please soft delete first');
  }

  await BusinessCategory.findByIdAndDelete(id);
  return {
    message: 'Business category permanently deleted successfully',
  };
};

//  Create Product Category (Linked to Business)
const createProductCategory = async (
  payload: TProductCategory,
  currentUser: AuthUser
) => {
  await findUserByEmailOrId({ userId: currentUser.id, isDeleted: false });
  const business = await BusinessCategory.findById(payload.businessCategoryId);
  if (!business) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      'Invalid Business Category reference'
    );
  }

  const exists = await ProductCategory.findOne({ name: payload.name });
  if (exists) {
    throw new AppError(httpStatus.CONFLICT, 'Product category already exists');
  }

  payload.slug = payload.name
    .toLowerCase()
    .replace(/[^\w ]+/g, '')
    .replace(/ +/g, '-');

  const category = await ProductCategory.create(payload);
  return category;
};

//  Get All Product Categories (with Business ref)
const getAllProductCategories = async (
  query: Record<string, unknown>,
  currentUser: AuthUser
) => {
  const result = await findUserByEmailOrId({
    userId: currentUser.id,
    isDeleted: false,
  });
  const user = result.user;
  if (currentUser.role === 'VENDOR') {
    query.isActive = true;
    query.isDeleted = false;
    const findBusinessCategory = await BusinessCategory.findOne({
      name: user?.businessDetails?.businessType,
    });
    query.businessCategoryId = findBusinessCategory?._id;
  }
  const productCategories = new QueryBuilder(ProductCategory.find(), query)
    .fields()
    .paginate()
    .sort()
    .filter()
    .search(['name', 'slug']);

  const meta = await productCategories.countTotal();
  const data = await productCategories.modelQuery;
  return { meta, data };
};

// get single product category
const getSingleProductCategory = async (id: string, currentUser: AuthUser) => {
  await findUserByEmailOrId({ userId: currentUser.id, isDeleted: false });
  const category = await ProductCategory.findById(id);
  if (!category)
    throw new AppError(httpStatus.NOT_FOUND, 'Product category not found');
  if (currentUser.role === 'VENDOR' && category.isActive === false) {
    throw new AppError(httpStatus.NOT_FOUND, 'Product category not found');
  }

  return category;
};

//  Update Product Category
const updateProductCategory = async (
  id: string,
  payload: Partial<TProductCategory>,
  currentUser: AuthUser
) => {
  await findUserByEmailOrId({ userId: currentUser.id, isDeleted: false });
  const category = await ProductCategory.findById(id);
  if (!category) {
    throw new AppError(httpStatus.NOT_FOUND, 'Product category not found');
  }

  if (payload.name) {
    payload.slug = payload.name
      .toLowerCase()
      .replace(/[^\w ]+/g, '')
      .replace(/ +/g, '-');
  }

  if (payload?.businessCategoryId) {
    const business = await BusinessCategory.findById(
      payload.businessCategoryId
    );
    if (!business) {
      throw new AppError(
        httpStatus.NOT_FOUND,
        'Invalid Business Category reference'
      );
    }
  }

  if (payload?.isActive === category.isActive) {
    throw new AppError(
      httpStatus.CONFLICT,
      `Product category is already ${category.isActive}`
    );
  }

  Object.assign(category, payload);
  await category.save();

  return category;
};

// soft delete Product Category
const softDeleteProductCategory = async (id: string, currentUser: AuthUser) => {
  await findUserByEmailOrId({ userId: currentUser.id, isDeleted: false });
  const category = await ProductCategory.findById(id);
  if (!category) {
    throw new AppError(httpStatus.NOT_FOUND, 'Product category not found');
  }

  if (category.isDeleted === true) {
    throw new AppError(httpStatus.CONFLICT, 'Product category already deleted');
  }

  if (category.isActive) {
    throw new AppError(httpStatus.CONFLICT, 'Product category is active');
  }

  category.isDeleted = true;
  await category.save();
  return {
    message: 'Product category deleted successfully',
  };
};
// Permanent Delete Product Category
const permanentDeleteProductCategory = async (
  id: string,
  currentUser: AuthUser
) => {
  await findUserByEmailOrId({ userId: currentUser.id, isDeleted: false });
  const category = await ProductCategory.findById(id);
  if (!category) {
    throw new AppError(httpStatus.NOT_FOUND, 'Product category not found');
  }

  if (category.isDeleted === false) {
    throw new AppError(httpStatus.CONFLICT, 'Please soft delete first');
  }

  await ProductCategory.findByIdAndDelete(id);
  return {
    message: 'Product category permanently deleted successfully',
  };
};

export const CategoryService = {
  createBusinessCategory,
  getAllBusinessCategories,
  getSingleBusinessCategory,
  updateBusinessCategory,
  softDeleteBusinessCategory,
  permanentDeleteBusinessCategory,
  createProductCategory,
  getAllProductCategories,
  getSingleProductCategory,
  updateProductCategory,
  softDeleteProductCategory,
  permanentDeleteProductCategory,
};
