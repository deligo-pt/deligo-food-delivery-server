import httpStatus from 'http-status';
import AppError from '../../errors/AppError';
import { BusinessCategory, ProductCategory } from './category.model';
import { TBusinessCategory, TProductCategory } from './category.interface';
import { QueryBuilder } from '../../builder/QueryBuilder';
import { deleteSingleImageFromCloudinary } from '../../utils/deleteImage';
import { TCurrentUser } from '../../constant/GlobalInterface/user.interface';
import { formatBusinessCategoryResponse } from './category.utils';

//  Create Business Category
const createBusinessCategory = async (
  payload: TBusinessCategory,
  icon: string | null,
) => {
  const exists = await BusinessCategory.findOne({ name: payload.name });
  if (exists) {
    throw new AppError(httpStatus.CONFLICT, 'Business category already exists');
  }

  // generate slug
  payload.slug = payload.name
    .toLowerCase()
    .replace(/[^\w ]+/g, '')
    .replace(/ +/g, '-');

  const category = await BusinessCategory.create({ ...payload, icon });
  return category;
};

//  Update Business Category
const updateBusinessCategory = async (
  id: string,
  payload: Partial<TBusinessCategory>,
  icon: string | null,
) => {
  const category = await BusinessCategory.findById(id);
  if (!category) {
    throw new AppError(httpStatus.NOT_FOUND, 'Business category not found');
  }
  if (payload.name)
    payload.slug = payload.name
      .toLowerCase()
      .replace(/[^\w ]+/g, '')
      .replace(/ +/g, '-');

  if (payload?.isActive === category.isActive) {
    throw new AppError(
      httpStatus.CONFLICT,
      `Business category is already ${category.isActive}`,
    );
  }

  if (icon) {
    if (category.icon) {
      const oldIcon = category.icon;
      deleteSingleImageFromCloudinary(oldIcon).catch((error) => {
        console.error(error);
      });
    }
  }
  if (icon) {
    category.icon = icon;
  }

  Object.assign(category, payload);
  await category.save();
  return category;
};

//  Get All Business Categories
const getAllBusinessCategories = async (
  query: Record<string, unknown>,
  currentUser: TCurrentUser,
) => {
  const { role } = currentUser;
  const isAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN';
  if (!isAdmin) {
    ((query.isActive = true), (query.isDeleted = false));
  }
  const businessCategories = new QueryBuilder(BusinessCategory.find(), query)
    .search(['name', 'slug'])
    .filter()
    .sort()
    .paginate()
    .fields();

  const [meta, data] = await Promise.all([
    businessCategories.countTotal(),
    businessCategories.modelQuery,
  ]);

  return { meta, data };
};

//  Get All Business Categories Public
const getAllBusinessCategoriesPublic = async (
  query: Record<string, unknown>,
) => {
  query.isActive = true;
  query.isDeleted = false;

  const businessCategories = new QueryBuilder(BusinessCategory.find(), query)
    .search(['name', 'slug'])
    .filter()
    .sort()
    .paginate()
    .fields();

  const [meta, data] = await Promise.all([
    businessCategories.countTotal(),
    businessCategories.modelQuery,
  ]);
  return { meta, data };
};

//  Get Single Business Category
const getSingleBusinessCategory = async (
  id: string,
  currentUser: TCurrentUser,
) => {
  const { role } = currentUser;
  const isAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN';

  const category = await BusinessCategory.findById(id);
  if (!category) {
    throw new AppError(httpStatus.NOT_FOUND, 'Business category not found');
  }

  if (!isAdmin && category.isActive === false && category.isDeleted === true) {
    throw new AppError(httpStatus.NOT_FOUND, 'Business category not found');
  }

  return category;
};

//  Get Single Business Category Public
const getSingleBusinessCategoryPublic = async (id: string) => {
  const category = await BusinessCategory.findById(id);
  if (!category) {
    throw new AppError(httpStatus.NOT_FOUND, 'Business category not found');
  }

  if (category.isActive === false && category.isDeleted === true) {
    throw new AppError(httpStatus.NOT_FOUND, 'Business category not found');
  }

  return category;
};

// Soft Delete Business Category
const softDeleteBusinessCategory = async (id: string) => {
  const category = await BusinessCategory.findById(id);
  if (!category)
    throw new AppError(httpStatus.NOT_FOUND, 'Business category not found');
  if (category.isDeleted === true) {
    throw new AppError(
      httpStatus.CONFLICT,
      'Business category already deleted',
    );
  }

  if (category.isActive) {
    throw new AppError(
      httpStatus.CONFLICT,
      'Business category is active, cannot delete',
    );
  }

  category.isDeleted = true;
  await category.save();
  return {
    message: 'Business category deleted successfully',
  };
};

// Permanent Delete Business Category
const permanentDeleteBusinessCategory = async (id: string) => {
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

export const BusinessCategoryService = {
  createBusinessCategory,
  getAllBusinessCategories,
  getAllBusinessCategoriesPublic,
  getSingleBusinessCategory,
  getSingleBusinessCategoryPublic,
  updateBusinessCategory,
  softDeleteBusinessCategory,
  permanentDeleteBusinessCategory,
};
