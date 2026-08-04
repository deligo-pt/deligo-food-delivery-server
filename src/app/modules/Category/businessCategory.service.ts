/* eslint-disable @typescript-eslint/no-explicit-any */
import httpStatus from 'http-status';
import AppError from '../../errors/AppError';
import { BusinessCategory } from './category.model';
import {
  BusinessCategoryTranslation,
  TCreateBusinessCategoryInput,
} from './category.interface';
import { QueryBuilder } from '../../builder/QueryBuilder';
import { deleteSingleImageFromCloudinary } from '../../utils/deleteImage';
import { TCurrentUser } from '../../constant/GlobalInterface/user.interface';

//  Create Business Category
const createBusinessCategory = async (
  payload: TCreateBusinessCategoryInput,
  icon: string | null,
) => {
  const translation = BusinessCategoryTranslation[payload.name];

  if (!translation) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'INVALID_BUSINESS_CATEGORY_NAME',
    );
  }

  const exists = await BusinessCategory.findOne({ 'name.en': translation.en });
  if (exists) {
    throw new AppError(httpStatus.CONFLICT, 'BUSINESS_CATEGORY_ALREADY_EXISTS');
  }

  const slug = translation.en
    .toLowerCase()
    .replace(/[^\w ]+/g, '')
    .replace(/ +/g, '-');

  const categoryData = {
    ...payload,
    name: translation,
    slug,
    icon,
  };

  if (!icon) {
    throw new AppError(httpStatus.BAD_REQUEST, 'ICON_IS_REQUIRED');
  }

  const category = await BusinessCategory.create(categoryData);

  return {
    messageKey: 'COMMON_CREATED_SUCCESS',
    variables: { entity: 'Business Category' },
    data: category,
  };
};

//  Update Business Category
const updateBusinessCategory = async (
  id: string,
  payload: Partial<TCreateBusinessCategoryInput>,
  icon: string | null,
) => {
  const category = await BusinessCategory.findById(id);
  if (!category) {
    throw new AppError(httpStatus.NOT_FOUND, 'NOT_FOUND_MESSAGE', {
      entity: 'Business Category',
    });
  }

  if (payload.name) {
    const translation = BusinessCategoryTranslation[payload.name];
    if (!translation) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'INVALID_BUSINESS_CATEGORY_NAME',
      );
    }

    payload.name = translation as any;

    payload.slug = translation.en
      .toLowerCase()
      .replace(/[^\w ]+/g, '')
      .replace(/ +/g, '-');
  }

  if (
    payload?.isActive !== undefined &&
    payload.isActive === category.isActive
  ) {
    throw new AppError(
      httpStatus.CONFLICT,
      category.isActive
        ? 'BUSINESS_CATEGORY_ALREADY_ACTIVE'
        : 'BUSINESS_CATEGORY_ALREADY_INACTIVE',
    );
  }

  if (icon) {
    if (category.icon) {
      const oldIcon = category.icon;
      deleteSingleImageFromCloudinary(oldIcon).catch((error) => {
        console.error('Failed to delete old icon from Cloudinary:', error);
      });
    }
    category.icon = icon;
  }

  Object.assign(category, payload);
  await category.save();

  return {
    messageKey: 'COMMON_UPDATED_SUCCESS',
    variables: { entity: 'Business Category Details' },
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
    messageKey: 'DATA_LOAD_SUCCESS',
    variables: { entity: 'Business Categories', isPlural: true },
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
    messageKey: 'DATA_LOAD_SUCCESS',
    variables: { entity: 'Business Categories', isPlural: true },
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
    throw new AppError(httpStatus.NOT_FOUND, 'NOT_FOUND_MESSAGE', {
      entity: 'Business Category',
    });
  }

  if (!isAdmin && category.isActive === false && category.isDeleted === true) {
    throw new AppError(httpStatus.NOT_FOUND, 'NOT_FOUND_MESSAGE', {
      entity: 'Business Category',
    });
  }

  return {
    messageKey: 'DATA_LOAD_SUCCESS',
    variables: { entity: 'Business Category' },
    data: category,
  };
};

//  Get Single Business Category Public
const getSingleBusinessCategoryPublic = async (id: string) => {
  const category = await BusinessCategory.findById(id);
  if (!category) {
    throw new AppError(httpStatus.NOT_FOUND, 'NOT_FOUND_MESSAGE', {
      entity: 'Business Category',
    });
  }

  if (category.isActive === false && category.isDeleted === true) {
    throw new AppError(httpStatus.NOT_FOUND, 'NOT_FOUND_MESSAGE', {
      entity: 'Business Category',
    });
  }

  return {
    messageKey: 'DATA_LOAD_SUCCESS',
    variables: { entity: 'Business Category' },
    data: category,
  };
};

// Soft Delete Business Category
const softDeleteBusinessCategory = async (id: string) => {
  const category = await BusinessCategory.findById(id);
  if (!category)
    throw new AppError(httpStatus.NOT_FOUND, 'NOT_FOUND_MESSAGE', {
      entity: 'Business Category',
    });
  if (category.isDeleted === true) {
    throw new AppError(
      httpStatus.CONFLICT,
      'BUSINESS_CATEGORY_ALREADY_DELETED',
    );
  }

  if (category.isActive) {
    throw new AppError(httpStatus.CONFLICT, 'ACTIVE_CATEGORY_CANNOT_DELETE');
  }

  category.isDeleted = true;
  await category.save();
  return {
    messageKey: 'COMMON_SOFT_DELETED_SUCCESS',
    variables: { entity: 'Business Category' },
  };
};

// Permanent Delete Business Category
const permanentDeleteBusinessCategory = async (id: string) => {
  const category = await BusinessCategory.findById(id);
  if (!category) {
    throw new AppError(httpStatus.NOT_FOUND, 'NOT_FOUND_MESSAGE', {
      entity: 'Business Category',
    });
  }
  if (category.isDeleted === false) {
    throw new AppError(httpStatus.CONFLICT, 'COMMON_MUST_SOFT_DELETE_FIRST');
  }

  await BusinessCategory.findByIdAndDelete(id);
  return {
    messageKey: 'COMMON_PERMANENTLY_DELETED_SUCCESS',
    variables: { entity: 'Business Category' },
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
