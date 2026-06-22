import httpStatus from 'http-status';
import AppError from '../../errors/AppError';
import { BusinessCategory, ProductCategory } from './category.model';
import { TBusinessCategory, TProductCategory } from './category.interface';
import { QueryBuilder } from '../../builder/QueryBuilder';
import { deleteSingleImageFromCloudinary } from '../../utils/deleteImage';
import { TCurrentUser } from '../../constant/GlobalInterface/user.interface';
import { formatProductCategoryResponse } from './category.utils';

//  Create Product Category (Linked to Business)
const createProductCategory = async (
  payload: TProductCategory,
  icon: string | null,
) => {
  const business = await BusinessCategory.findById(payload.businessCategoryId);
  if (!business) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      'Invalid Business Category reference',
    );
  }

  const exists = await ProductCategory.findOne({ 'name.en': payload.name.en });
  if (exists) {
    throw new AppError(httpStatus.CONFLICT, 'Product category already exists');
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
  return category;
};

//  Update Product Category
const updateProductCategory = async (
  id: string,
  payload: Partial<TProductCategory>,
  icon: string | null,
) => {
  const category = await ProductCategory.findById(id);
  if (!category) {
    throw new AppError(httpStatus.NOT_FOUND, 'Product category not found');
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
      throw new AppError(
        httpStatus.NOT_FOUND,
        'Invalid Business Category reference',
      );
    }
  }

  if (
    payload?.isActive !== undefined &&
    payload.isActive === category.isActive
  ) {
    throw new AppError(
      httpStatus.CONFLICT,
      `Product category is already ${category.isActive}`,
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

  return category;
};

//  Get All Product Categories (with Business ref)
const getAllProductCategories = async (
  query: Record<string, unknown>,
  currentUser: TCurrentUser,
  lng: 'en' | 'pt',
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

  const formattedData = data.map((category) =>
    formatProductCategoryResponse(category, lng),
  );

  return { meta, data: formattedData };
};

//  Get All Product Categories Public
const getAllProductCategoriesPublic = async (
  query: Record<string, unknown>,
  lng: 'en' | 'pt',
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

  const formattedData = data.map((category) =>
    formatProductCategoryResponse(category, lng),
  );

  return { meta, data: formattedData };
};

// get single product category
const getSingleProductCategory = async (
  id: string,
  currentUser: TCurrentUser,
) => {
  const category = await ProductCategory.findById(id);
  if (!category) {
    throw new AppError(httpStatus.NOT_FOUND, 'Product category not found');
  }

  const { role } = currentUser;
  const isAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN';
  const isVendor = role === 'VENDOR';

  // Non-admin users cannot access deleted or inactive categories
  if (!isAdmin && (category.isDeleted || !category.isActive)) {
    throw new AppError(httpStatus.NOT_FOUND, 'Product category not found');
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
      throw new AppError(httpStatus.NOT_FOUND, 'Product category not found');
    }
  }

  return category;
};

//  get single product category public
const getSingleProductCategoryPublic = async (id: string) => {
  const category = await ProductCategory.findById(id);
  if (!category) {
    throw new AppError(httpStatus.NOT_FOUND, 'Product category not found');
  }

  if (category.isDeleted || !category.isActive) {
    throw new AppError(httpStatus.NOT_FOUND, 'Product category not found');
  }

  return category;
};

// soft delete Product Category
const softDeleteProductCategory = async (id: string) => {
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
const permanentDeleteProductCategory = async (id: string) => {
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
