/* eslint-disable @typescript-eslint/no-explicit-any */
import httpStatus from 'http-status';
import AppError from '../../errors/AppError';
import { Tax } from '../Tax/tax.model';
import { BusinessCategoryName } from '../Category/category.interface';
import { generateSlug } from './product.utils';
import { TProduct } from './product.interface';
import { TCurrentUser } from '../../constant/GlobalInterface/user.interface';
import { Product } from './product.model';
import { CreateProductUtils } from './createProduct.utils';

const getAndValidateProduct = async (
  productId: string,
  currentUser: TCurrentUser,
) => {
  const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(currentUser.role);
  if (currentUser?.status !== 'APPROVED') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'NOT_AUTHORIZED_TO_UPDATE_ACCOUNT_STATUS',
      { status: currentUser.status },
    );
  }
  const product = await Product.findOne({
    productId,
    ...(!isAdmin &&
      currentUser.role === 'VENDOR' && { vendorId: currentUser._id }),
  }).populate('vendorId', 'businessDetails.businessType');

  if (!product) {
    throw new AppError(httpStatus.NOT_FOUND, 'PRODUCT_NOT_FOUND');
  }

  return product;
};

const prepareUpdateData = async (
  payload: Partial<TProduct>,
  existingProduct: TProduct,
) => {
  const modifiedData: Record<string, any> = {};

  if (payload.name) {
    if (payload.name.en) modifiedData['name.en'] = payload.name.en;
    if (payload.name.pt) modifiedData['name.pt'] = payload.name.pt;
    const finalSlugName = payload.name.en || existingProduct?.name?.en || '';
    modifiedData.slug = generateSlug(finalSlugName);
  }
  if (payload.description) {
    if (payload.description.en)
      modifiedData['description.en'] = payload.description.en;
    if (payload.description.pt)
      modifiedData['description.pt'] = payload.description.pt;
  }
  if (payload.category) modifiedData.category = payload.category;
  if (payload.subCategory) modifiedData.subCategory = payload.subCategory;
  if (payload.brand) modifiedData.brand = payload.brand;
  if (payload.addonGroups && payload.addonGroups.length > 0) {
    await CreateProductUtils.validateAddons(payload, existingProduct.vendorId);
    modifiedData.addonGroups = payload.addonGroups;
  }

  if (payload.pricing) {
    const { taxId, currency, discount, price } = payload.pricing;
    if (price !== undefined) modifiedData['pricing.price'] = price;
    if (currency) modifiedData['pricing.currency'] = currency;
    if (discount !== undefined) modifiedData['pricing.discount'] = discount;

    if (taxId) {
      const tax = await Tax.findById(taxId);
      if (!tax) throw new AppError(httpStatus.NOT_FOUND, 'TAX_NOT_FOUND');
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
