/* eslint-disable @typescript-eslint/no-explicit-any */
import httpStatus from 'http-status';
import AppError from '../../errors/AppError';
import { Tax } from '../Tax/tax.model';
import { BusinessCategoryName } from '../Category/category.interface';
import { generateSlug } from './product.utils';
import { TProduct } from './product.interface';
import { AuthUser } from '../../constant/GlobalInterface/user.interface';
import { Product } from './product.model';

const getAndValidateProduct = async (
  productId: string,
  currentUser: AuthUser,
) => {
  const product = await Product.findOne({
    productId,
    ...(currentUser.role === 'VENDOR' && { vendorId: currentUser._id }),
  }).populate('vendorId', 'businessDetails.businessType');

  if (!product) throw new AppError(httpStatus.NOT_FOUND, 'Product not found');
  if (currentUser?.status !== 'APPROVED')
    throw new AppError(httpStatus.FORBIDDEN, 'Action forbidden.');

  return product;
};

const prepareUpdateData = async (payload: Partial<TProduct>) => {
  const modifiedData: Record<string, any> = {};

  if (payload.name) {
    modifiedData.name = payload.name;
    modifiedData.slug = generateSlug(payload.name);
  }
  if (payload.description) modifiedData.description = payload.description;
  if (payload.category) modifiedData.category = payload.category;
  if (payload.subCategory) modifiedData.subCategory = payload.subCategory;
  if (payload.brand) modifiedData.brand = payload.brand;
  if (payload.addonGroups) modifiedData.addonGroups = payload.addonGroups;

  if (payload.pricing) {
    const { taxId, currency, discount, price } = payload.pricing;
    if (price !== undefined) modifiedData['pricing.price'] = price;
    if (currency) modifiedData['pricing.currency'] = currency;
    if (discount !== undefined) modifiedData['pricing.discount'] = discount;

    if (taxId) {
      const tax = await Tax.findById(taxId);
      if (!tax) throw new AppError(httpStatus.NOT_FOUND, 'Tax not found');
      modifiedData['pricing.taxId'] = taxId;
      modifiedData['pricing.taxRate'] = tax.taxRate;
    }
  }

  if (payload.stock?.unit) modifiedData['stock.unit'] = payload.stock.unit;

  if (payload.meta) {
    Object.keys(payload.meta).forEach((key) => {
      modifiedData[`meta.${key}`] = (payload.meta as any)[key];
    });
  }

  return modifiedData;
};

const syncStockStatus = async (updatedProduct: any, existingProduct: any) => {
  const vendorBusinessType = (existingProduct?.vendorId as any)?.businessDetails
    ?.businessType;

  if (
    updatedProduct &&
    vendorBusinessType !== BusinessCategoryName.RESTAURANT &&
    updatedProduct.stock
  ) {
    const finalQty = updatedProduct.stock.quantity;
    updatedProduct.stock.availabilityStatus =
      finalQty > 0 ? (finalQty < 5 ? 'Limited' : 'In Stock') : 'Out of Stock';

    await updatedProduct.save();
  }
};

export const UpdateProductUtils = {
  getAndValidateProduct,
  prepareUpdateData,
  syncStockStatus,
};

