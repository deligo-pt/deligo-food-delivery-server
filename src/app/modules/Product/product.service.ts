/* eslint-disable @typescript-eslint/no-explicit-any */

import httpStatus from 'http-status';
import { AuthUser } from '../../constant/user.const';
import AppError from '../../errors/AppError';
import { Vendor } from '../Vendor/vendor.model';
import { TProduct } from './product.interface';
import { Product } from './product.model';
import { QueryBuilder } from '../../builder/QueryBuilder';
import { ProductSearchableFields } from './product.constant';
import { findUserByEmailOrId } from '../../utils/findUserByEmailOrId';

// Product Create Service
const createProduct = async (
  payload: TProduct,
  user: AuthUser,
  images: string[]
) => {
  //  ------------ Vendor Details Adjustment ------------
  const existingVendor = await Vendor.findOne({ userId: user.id });
  if (!existingVendor) {
    throw new AppError(httpStatus.NOT_FOUND, 'Vendor not found');
  }
  if (existingVendor?.status !== 'APPROVED') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'Vendor is not approved to add products'
    );
  }
  payload.vendor = {
    vendorId: existingVendor?.userId,
    vendorName: existingVendor?.businessDetails?.businessName || '',
    vendorType: existingVendor?.businessDetails?.businessType || '',
    rating: existingVendor?.rating?.average || 0,
  };

  //  ------------ Generating productId ------------
  const lastProduct = await Product.findOne().sort({ productId: -1 });
  let newProductId = 'PROD-0001';
  if (lastProduct) {
    const lastProductIdNumber = parseInt(lastProduct.productId.split('-')[1]);
    const newProductIdNumber = lastProductIdNumber + 1;
    newProductId = `PROD-${String(newProductIdNumber).padStart(4, '0')}`;
  }
  payload.productId = newProductId;
  //  ------------ Generating slug ------------
  const newSlug = payload.name
    .toLowerCase()
    .replace(/ /g, '-')
    .replace(/[^\w-]+/g, '');
  payload.slug = newSlug;
  //  ------------ Generating SKU ------------
  const newSKU = `SKU-${payload?.category?.toUpperCase()}-${String(newProductId)
    .split('-')
    .pop()
    ?.padStart(4, '0')}`;
  payload.sku = newSKU;

  const newProduct = await Product.create({ ...payload, images });
  return newProduct;
};

// update Product Service
const updateProduct = async (
  productId: string,
  payload: Partial<TProduct>,
  currentUser: AuthUser,
  images: string[]
) => {
  const existingProduct = await Product.findOne({
    productId,
    ...(currentUser.role === 'VENDOR' && { 'vendor.vendorId': currentUser.id }),
  });

  if (!existingProduct) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      'Product not found or you are not authorized to update this product'
    );
  }

  const result = await findUserByEmailOrId({
    userId: currentUser.id,
    isDeleted: false,
  });
  if (!result?.user) {
    throw new AppError(
      httpStatus.UNAUTHORIZED,
      'You are not authorized to update this product'
    );
  }

  const nestedFields = [
    'pricing',
    'stock',
    'deliveryInfo',
    'meta',
    'attributes',
  ] as const;

  const mergeInto = (target: any, src: any) => {
    const t = (target?.toObject?.() || target) ?? {};
    Object.entries(src).forEach(([k, v]) => {
      if (v !== undefined) (t as any)[k] = v;
    });
    return t;
  };

  for (const [key, value] of Object.entries(payload)) {
    if (value === undefined) continue;
    if (key === 'images' && Array.isArray(value)) {
      existingProduct.images = [...(existingProduct.images || []), ...value];
      continue;
    }
    if (key === 'tags' && Array.isArray(value)) {
      existingProduct.tags = value as string[];
      continue;
    }
    if (
      (nestedFields as readonly string[]).includes(key) &&
      !Array.isArray(value) &&
      typeof value === 'object'
    ) {
      (existingProduct as any)[key] = mergeInto(
        (existingProduct as any)[key],
        value
      );
      if (key === 'attributes') existingProduct.markModified('attributes');
      if (key === 'pricing') existingProduct.markModified('pricing');
      if (key === 'stock') existingProduct.markModified('stock');
      if (key === 'deliveryInfo') existingProduct.markModified('deliveryInfo');
      if (key === 'meta') existingProduct.markModified('meta');
      continue;
    }
    (existingProduct as any)[key] = value;
  }

  if (images && images.length > 0) {
    existingProduct.images = [...(existingProduct.images || []), ...images];
  }
  await existingProduct.save({ validateModifiedOnly: true });
  return existingProduct;
};

// product image delete service
const deleteProductImages = async (
  productId: string,
  images: string[],
  currentUser: AuthUser
) => {
  await findUserByEmailOrId({
    userId: currentUser.id,
    isDeleted: false,
  });

  const product = await Product.findOne({ productId });
  if (!product) {
    throw new AppError(httpStatus.NOT_FOUND, 'Product not found');
  }

  // -------------check if images to be deleted exist in product images-------------
  const invalidImages = images.filter((img) => !product.images.includes(img));
  if (invalidImages.length > 0) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Invalid images');
  }

  // Remove images from product
  product.images = product.images.filter((img) => !images.includes(img));
  await product.save();

  return product;
};

// get all products by vendor service
const getAllProductsByVendor = async (
  vendorId: string,
  query: Record<string, unknown>
) => {
  const existingVendor = await Vendor.findOne({
    userId: vendorId,
    isDeleted: false,
  });
  if (!existingVendor) {
    throw new AppError(httpStatus.NOT_FOUND, 'Vendor not found');
  }
  const products = new QueryBuilder(
    Product.find({ 'vendor.vendorId': vendorId, isDeleted: false }),
    query
  )
    .fields()
    .paginate()
    .sort()
    .filter()
    .search(ProductSearchableFields);
  const result = await products.modelQuery;
  return result;
};

// get single product by vendor service
const getSingleProductByVendor = async (
  vendorId: string,
  productId: string
) => {
  const product = await Product.findOne({
    productId,
    'vendor.vendorId': vendorId,
    isDeleted: false,
  });
  if (!product) {
    throw new AppError(httpStatus.NOT_FOUND, 'Product not found');
  }

  return product;
};

// get all products service
const getAllProducts = async (
  query: Record<string, unknown>,
  currentUser: AuthUser
) => {
  await findUserByEmailOrId({
    userId: currentUser.id,
    isDeleted: false,
  });

  if (currentUser.role === 'CUSTOMER') {
    query.isApproved = true;
    query.isDeleted = false;
  }
  const products = new QueryBuilder(Product.find(), query)
    .fields()
    .paginate()
    .sort()
    .filter()
    .search(ProductSearchableFields);
  const result = await products.modelQuery;
  return result;
};

// get single product service
const getSingleProduct = async (productId: string, currentUser: AuthUser) => {
  await findUserByEmailOrId({
    userId: currentUser.id,
    isDeleted: false,
  });
  let product;
  if (
    currentUser.role === 'CUSTOMER' ||
    currentUser.role === 'DELIVERY_PARTNER' ||
    currentUser.role === 'FLEET_MANAGER'
  ) {
    product = await Product.findOne({
      productId,
      isApproved: true,
      isDeleted: false,
    });
  } else {
    product = await Product.findOne({ productId });
  }

  if (!product) {
    throw new AppError(httpStatus.NOT_FOUND, 'Product not found');
  }
  return product;
};

// product soft delete service
const softDeleteProduct = async (productId: string, currentUser: AuthUser) => {
  await findUserByEmailOrId({
    userId: currentUser.id,
    isDeleted: false,
  });
  const product = await Product.findOne({ productId });
  if (currentUser.role === 'VENDOR') {
    if (currentUser.id !== product?.vendor.vendorId) {
      throw new AppError(
        httpStatus.NOT_FOUND,
        'You are not authorized to delete this product'
      );
    }
  }

  if (product?.isDeleted) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Product is already deleted');
  }

  if (!product) {
    throw new AppError(httpStatus.NOT_FOUND, 'Product not found');
  }
  product.isDeleted = true;
  await product.save();
  return {
    message: `${product.name} has been deleted successfully`,
  };
};

//  product permanent delete service (admin only)
const permanentDeleteProduct = async (
  productId: string,
  currentUser: AuthUser
) => {
  await findUserByEmailOrId({
    userId: currentUser.id,
    isDeleted: false,
  });
  const product = await Product.findOne({ productId });

  if (product?.isDeleted === false) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Product must be soft deleted before permanent deletion'
    );
  }

  if (!product) {
    throw new AppError(httpStatus.NOT_FOUND, 'Product not found');
  }
  await product.deleteOne();
  return {
    message: `${product.name} has been permanently deleted successfully`,
  };
};

export const ProductServices = {
  createProduct,
  getAllProducts,
  getAllProductsByVendor,
  getSingleProduct,
  getSingleProductByVendor,
  updateProduct,
  deleteProductImages,
  softDeleteProduct,
  permanentDeleteProduct,
};
