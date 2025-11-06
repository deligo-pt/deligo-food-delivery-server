/* eslint-disable @typescript-eslint/no-explicit-any */

import httpStatus from 'http-status';
import { AuthUser } from '../../constant/user.const';
import AppError from '../../errors/AppError';
import { Vendor } from '../Vendor/vendor.model';
import { TProduct } from './product.interface';
import { Product } from './product.model';
import { QueryBuilder } from '../../builder/QueryBuilder';
import { ProductSearchableFields } from './product.constant';

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
  user: AuthUser,
  images: string[]
) => {
  const existingProduct = await Product.findOne({ productId });
  if (!existingProduct) {
    throw new AppError(httpStatus.NOT_FOUND, 'Product not found');
  }

  if (user.role === 'VENDOR') {
    const existingProduct = await Product.findOne({
      productId,
      'vendor.vendorId': user.id,
    });
    if (!existingProduct) {
      throw new AppError(
        httpStatus.NOT_FOUND,
        'Product not found or you are not authorized to update this product'
      );
    }
  }

  // ------------Generating Product Final Price if price or discount is updated ------------
  if (payload.pricing?.price || payload.pricing?.discount) {
    const newPrice = payload.pricing?.price || existingProduct.pricing?.price;
    const discountAmount =
      (newPrice *
        (payload.pricing?.discount
          ? payload.pricing?.discount
          : existingProduct.pricing?.discount || 0)) /
      100;
    const finalPrice = newPrice - discountAmount;
    payload.pricing.finalPrice = parseFloat(finalPrice.toFixed(2));
  }

  // ----------- Image URLs Adjustment ------------
  if (images.length > 0) {
    payload.images = images;
  }

  const product = await Product.findOneAndUpdate({ productId }, payload, {
    new: true,
  });
  return product;
};

// product image delete service
const deleteProductImages = async (productId: string, images: string[]) => {
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
  const products = new QueryBuilder(
    Product.find({ 'vendor.vendorId': vendorId }),
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
  });
  if (!product) {
    throw new AppError(httpStatus.NOT_FOUND, 'Product not found');
  }

  return product;
};

// get all products service
const getAllProducts = async (
  query: Record<string, unknown>,
  user: AuthUser
) => {
  if (user.role === 'CUSTOMER') {
    query.isApproved = true;
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
const getSingleProduct = async (productId: string) => {
  const product = await Product.findOne({ productId });
  if (!product) {
    throw new AppError(httpStatus.NOT_FOUND, 'Product not found');
  }
  return product;
};

export const ProductServices = {
  createProduct,
  getAllProducts,
  getAllProductsByVendor,
  getSingleProduct,
  getSingleProductByVendor,
  updateProduct,
  deleteProductImages,
};
