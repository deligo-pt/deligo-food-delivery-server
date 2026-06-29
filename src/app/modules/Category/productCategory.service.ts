import httpStatus from 'http-status';
import AppError from '../../errors/AppError';
import { BusinessCategory, ProductCategory } from './category.model';
import { TProductCategory } from './category.interface';
import { QueryBuilder } from '../../builder/QueryBuilder';
import { deleteSingleImageFromCloudinary } from '../../utils/deleteImage';
import { TCurrentUser } from '../../constant/GlobalInterface/user.interface';

//  Create Product Category (Linked to Business)
const createProductCategory = async (
  payload: TProductCategory,
  icon: string | null,
) => {
  const business = await BusinessCategory.findById(payload.businessCategoryId);
  if (!business) {
    throw new AppError(httpStatus.NOT_FOUND, 'INVALID_BUSINESS_CATEGORY');
  }

  const exists = await ProductCategory.findOne({ 'name.en': payload.name.en });
  if (exists) {
    throw new AppError(httpStatus.CONFLICT, 'ALREADY_EXISTS');
  }

  payload.name.en = payload.name.en.toUpperCase();
  payload.name.pt = payload.name.pt.toUpperCase();

  payload.slug = payload.name.en
    .toLowerCase()
    .replace(/[^\w ]+/g, '')
    .replace(/ +/g, '-');

  if (icon) {
    payload.icon = icon;
  }

  const category = await ProductCategory.create(payload);
  return {
    messageKey: 'CREATE_SUCCESS' as const,
    data: category,
  };
};

//  Update Product Category
const updateProductCategory = async (
  id: string,
  payload: Partial<TProductCategory>,
  icon: string | null,
) => {
  const category = await ProductCategory.findById(id);
  if (!category) {
    throw new AppError(httpStatus.NOT_FOUND, 'NOT_FOUND');
  }

  if (payload.name) {
    payload.name = {
      ...category.name,
      ...payload.name,
    };

    if (payload.name.en) payload.name.en = payload.name.en.toUpperCase();
    if (payload.name.pt) payload.name.pt = payload.name.pt.toUpperCase();

    if (payload.name.en) {
      payload.slug = payload.name.en
        .toLowerCase()
        .replace(/[^\w ]+/g, '')
        .replace(/ +/g, '-');
    }
  }

  if (payload?.businessCategoryId) {
    const business = await BusinessCategory.findById(
      payload.businessCategoryId,
    );
    if (!business) {
      throw new AppError(httpStatus.NOT_FOUND, 'INVALID_BUSINESS_CATEGORY');
    }
  }

  if (
    payload?.isActive !== undefined &&
    payload.isActive === category.isActive
  ) {
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
    category.icon = icon;
  }

  Object.assign(category, payload);
  await category.save();

  return {
    messageKey: 'UPDATE_SUCCESS' as const,
    data: category,
  };
};

//  Get All Product Categories (with Business ref)
const getAllProductCategories = async (
  query: Record<string, unknown>,
  currentUser: TCurrentUser,
) => {
  const { role } = currentUser;
  const isAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN';
  const isVendor = role === 'VENDOR';

  // Apply filters for non-admin users
  if (!isAdmin) {
    query.isActive = true;
    query.isDeleted = false;
  }

  // Additional filter for vendors: restrict to their business category
  if (isVendor) {
    const businessCategory = await BusinessCategory.findOne({
      name: currentUser?.businessDetails?.businessType,
    })
      .select('_id')
      .lean();

    if (businessCategory) {
      query.businessCategoryId = businessCategory._id;
    }
  }

  // Build and execute the query
  const productCategories = new QueryBuilder(ProductCategory.find(), query)
    .search(['name.en', 'name.pt', 'slug'])
    .filter()
    .sort()
    .paginate()
    .fields();

  const [meta, data] = await Promise.all([
    productCategories.countTotal(),
    productCategories.modelQuery,
  ]);

  return {
    messageKey: 'FETCH_ALL_SUCCESS' as const,
    meta,
    data,
  };
};

//  Get All Product Categories Public
const getAllProductCategoriesPublic = async (
  query: Record<string, unknown>,
) => {
  query.isActive = true;
  query.isDeleted = false;

  // Build and execute the query
  const productCategories = new QueryBuilder(ProductCategory.find(), query)
    .search(['name.en', 'name.pt', 'slug'])
    .filter()
    .sort()
    .paginate()
    .fields();

  const [meta, data] = await Promise.all([
    productCategories.countTotal(),
    productCategories.modelQuery,
  ]);

  return {
    messageKey: 'FETCH_ALL_SUCCESS' as const,
    meta,
    data,
  };
};

// get single product category
const getSingleProductCategory = async (
  id: string,
  currentUser: TCurrentUser,
) => {
  const category = await ProductCategory.findById(id);
  if (!category) {
    throw new AppError(httpStatus.NOT_FOUND, 'NOT_FOUND');
  }

  const { role } = currentUser;
  const isAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN';
  const isVendor = role === 'VENDOR';

  // Non-admin users cannot access deleted or inactive categories
  if (!isAdmin && (category.isDeleted || !category.isActive)) {
    throw new AppError(httpStatus.NOT_FOUND, 'NOT_FOUND');
  }

  // Vendors can only access categories from their business type
  if (isVendor) {
    const userBusinessCategory = await BusinessCategory.findOne({
      name: currentUser?.businessDetails?.businessType,
    })
      .select('_id')
      .lean();

    if (
      !userBusinessCategory ||
      String(category.businessCategoryId) !== String(userBusinessCategory._id)
    ) {
      throw new AppError(httpStatus.NOT_FOUND, 'NOT_FOUND');
    }
  }

  return {
    messageKey: 'FETCH_SINGLE_SUCCESS' as const,
    data: category,
  };
};

//  get single product category public
const getSingleProductCategoryPublic = async (id: string) => {
  const category = await ProductCategory.findById(id);
  if (!category) {
    throw new AppError(httpStatus.NOT_FOUND, 'NOT_FOUND');
  }

  if (category.isDeleted || !category.isActive) {
    throw new AppError(httpStatus.NOT_FOUND, 'NOT_FOUND');
  }

  return {
    messageKey: 'FETCH_SINGLE_SUCCESS' as const,
    data: category,
  };
};

// soft delete Product Category
const softDeleteProductCategory = async (id: string) => {
  const category = await ProductCategory.findById(id);
  if (!category) {
    throw new AppError(httpStatus.NOT_FOUND, 'NOT_FOUND');
  }

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
// Permanent Delete Product Category
const permanentDeleteProductCategory = async (id: string) => {
  const category = await ProductCategory.findById(id);
  if (!category) {
    throw new AppError(httpStatus.NOT_FOUND, 'NOT_FOUND');
  }

  if (category.isDeleted === false) {
    throw new AppError(httpStatus.CONFLICT, 'SOFT_DELETE_FIRST');
  }

  await ProductCategory.findByIdAndDelete(id);
  return {
    messageKey: 'PERMANENT_DELETE_SUCCESS' as const,
  };
};

export const ProductCategoryService = {
  createProductCategory,
  updateProductCategory,
  getAllProductCategories,
  getAllProductCategoriesPublic,
  getSingleProductCategory,
  getSingleProductCategoryPublic,
  softDeleteProductCategory,
  permanentDeleteProductCategory,
};
