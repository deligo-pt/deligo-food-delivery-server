import httpStatus from 'http-status';
import AppError from '../../errors/AppError';
import { BusinessCategory } from './category.model';
import { TBusinessCategory } from './category.interface';
import { QueryBuilder } from '../../builder/QueryBuilder';
import { deleteSingleImageFromCloudinary } from '../../utils/deleteImage';
import { TCurrentUser } from '../../constant/GlobalInterface/user.interface';

//  Create Business Category
const createBusinessCategory = async (
  payload: TBusinessCategory,
  icon: string | null,
) => {
  const exists = await BusinessCategory.findOne({ name: payload.name });
  if (exists) {
    throw new AppError(httpStatus.CONFLICT, 'ALREADY_EXISTS');
  }

  // generate slug
  payload.slug = payload.name
    .toLowerCase()
    .replace(/[^\w ]+/g, '')
    .replace(/ +/g, '-');

  const category = await BusinessCategory.create({ ...payload, icon });
  return {
    messageKey: 'CREATE_SUCCESS' as const,
    data: category,
  };
};

//  Update Business Category
const updateBusinessCategory = async (
  id: string,
  payload: Partial<TBusinessCategory>,
  icon: string | null,
) => {
  const category = await BusinessCategory.findById(id);
  if (!category) {
    throw new AppError(httpStatus.NOT_FOUND, 'NOT_FOUND');
  }
  if (payload.name)
    payload.slug = payload.name
      .toLowerCase()
      .replace(/[^\w ]+/g, '')
      .replace(/ +/g, '-');

  if (payload?.isActive === category.isActive) {
    throw new AppError(
      httpStatus.CONFLICT,
      category.isActive ? 'ALREADY_ACTIVE' : 'ALREADY_INACTIVE',
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
  return {
    messageKey: 'UPDATE_SUCCESS' as const,
    data: category,
  };
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

  return {
    messageKey: 'FETCH_ALL_SUCCESS' as const,
    meta,
    data,
  };
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
  return {
    messageKey: 'FETCH_ALL_SUCCESS' as const,
    meta,
    data,
  };
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
    throw new AppError(httpStatus.NOT_FOUND, 'NOT_FOUND');
  }

  if (!isAdmin && category.isActive === false && category.isDeleted === true) {
    throw new AppError(httpStatus.NOT_FOUND, 'NOT_FOUND');
  }

  return {
    messageKey: 'FETCH_SINGLE_SUCCESS' as const,
    data: category,
  };
};

//  Get Single Business Category Public
const getSingleBusinessCategoryPublic = async (id: string) => {
  const category = await BusinessCategory.findById(id);
  if (!category) {
    throw new AppError(httpStatus.NOT_FOUND, 'NOT_FOUND');
  }

  if (category.isActive === false && category.isDeleted === true) {
    throw new AppError(httpStatus.NOT_FOUND, 'NOT_FOUND');
  }

  return {
    messageKey: 'FETCH_SINGLE_SUCCESS' as const,
    data: category,
  };
};

// Soft Delete Business Category
const softDeleteBusinessCategory = async (id: string) => {
  const category = await BusinessCategory.findById(id);
  if (!category) throw new AppError(httpStatus.NOT_FOUND, 'NOT_FOUND');
  if (category.isDeleted === true) {
    throw new AppError(httpStatus.CONFLICT, 'ALREADY_DELETED');
  }

  if (category.isActive) {
    throw new AppError(httpStatus.CONFLICT, 'ACTIVE_CANNOT_DELETE');
  }

  category.isDeleted = true;
  await category.save();
  return {
    messageKey: 'SOFT_DELETE_SUCCESS' as const,
  };
};

// Permanent Delete Business Category
const permanentDeleteBusinessCategory = async (id: string) => {
  const category = await BusinessCategory.findById(id);
  if (!category) {
    throw new AppError(httpStatus.NOT_FOUND, 'NOT_FOUND');
  }
  if (category.isDeleted === false) {
    throw new AppError(httpStatus.CONFLICT, 'SOFT_DELETE_FIRST');
  }

  await BusinessCategory.findByIdAndDelete(id);
  return {
    messageKey: 'PERMANENT_DELETE_SUCCESS' as const,
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
