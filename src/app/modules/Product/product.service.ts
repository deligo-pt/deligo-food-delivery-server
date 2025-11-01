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
const createProduct = async (payload: TProduct, user: AuthUser) => {
  //  ------------ Vendor Details Adjustment ------------
  const existingVendor = await Vendor.findOne({ vendorId: user.id });
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
    vendorId: existingVendor?.vendorId,
    vendorName: existingVendor?.businessDetails?.businessName || '',
    vendorType: existingVendor?.businessDetails?.businessType || 'store',
    rating: existingVendor?.rating || 0,
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
  const newSlug =
    payload.name
      .toLowerCase()
      .replace(/ /g, '-')
      .replace(/[^\w-]+/g, '') +
    `-${String(newProductId.split('-')[1]).padStart(4, '0')}`;
  payload.slug = newSlug;
  //  ------------ Generating SKU ------------
  const newSKU = `SKU-${payload.productType.toUpperCase()}-${String(
    newProductId
  )
    .split('-')
    .pop()
    ?.padStart(4, '0')}`;
  payload.sku = newSKU;

  // ------------Generating Product Final Price ------------
  const discountAmount = (payload.price * (payload.discount || 0)) / 100;
  const finalPrice = payload.price - discountAmount;
  payload.finalPrice = parseFloat(finalPrice.toFixed(2));

  // ------------ Vendor Details Adjustment ------------

  const newProduct = await Product.create(payload);
  return newProduct;
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
const getAllProducts = async (query: Record<string, unknown>) => {
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
};
