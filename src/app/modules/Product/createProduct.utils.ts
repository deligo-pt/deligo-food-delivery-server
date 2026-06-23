/* eslint-disable @typescript-eslint/no-explicit-any */
import httpStatus from 'http-status';
import { TCurrentUser } from '../../constant/GlobalInterface/user.interface';
import AppError from '../../errors/AppError';
import customNanoId from '../../utils/customNanoId';
import { BusinessCategoryName } from '../Category/category.interface';
import { TProduct } from './product.interface';
import { cleanForSKU, generateSlug } from './product.utils';
import { Tax } from '../Tax/tax.model';
import { TTax } from '../Tax/tax.interface';
import { AddonGroup } from '../Add-Ons/addOns.model';
import { Types } from 'mongoose';
import { TUserRole } from '../../constant/GlobalConstant/user.constant';

const validateVendor = (currentUser: TCurrentUser) => {
  if (currentUser?.status !== 'APPROVED') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'Vendor is not approved to add products',
    );
  }
};

const validateBasePayload = (payload: TProduct) => {
  if (!payload.variations && !payload.pricing.price) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Price is required when no variations',
    );
  }
};

const validateCategory = (
  vendorCategoryExist: any,
  category: any,
  role: TUserRole,
) => {
  const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(role);
  if (!category) {
    throw new AppError(httpStatus.NOT_FOUND, 'Category not found');
  }

  if (
    !isAdmin &&
    category.businessCategoryId.toString() !==
      vendorCategoryExist?._id.toString()
  ) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Category is not under your business type',
    );
  }
};

const validateRestaurantStock = (
  vendorCategoryExist: any,
  payload: TProduct,
) => {
  if (
    vendorCategoryExist?.name === BusinessCategoryName.RESTAURANT &&
    payload.stock
  ) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Stock is not allowed for Restaurants',
    );
  }
};

export const validateAddons = async (
  payload: TProduct,
  vendorId: Types.ObjectId,
) => {
  if (!payload.addonGroups?.length) return;

  const validAddonsCount = await AddonGroup.countDocuments({
    _id: { $in: payload.addonGroups },
    vendorId,
    isDeleted: false,
  });

  if (validAddonsCount !== payload.addonGroups.length) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'One or more invalid Addon Groups',
    );
  }
};

const applyTax = async (payload: TProduct) => {
  if (!payload.pricing.taxId) return;

  const tax: TTax | null = await Tax.findById(payload.pricing.taxId);
  if (!tax) throw new AppError(httpStatus.NOT_FOUND, 'Tax not found');

  payload.pricing.taxRate = tax.taxRate;
};

const prepareBasicFields = (
  payload: TProduct,
  currentUser: TCurrentUser,
  category: any,
) => {
  const shortId = customNanoId(6);

  const productNamePart = cleanForSKU(payload.name.en || payload.name.pt || '');

  payload.vendorId = currentUser._id;
  payload.productId = `PROD-${shortId}`;

  payload.slug = generateSlug(payload.name.en || payload.name.pt || '');

  payload.sku = `${category?.name?.en
    .substring(0, 3)
    .toUpperCase()}-${productNamePart}-${shortId.split('-').pop()}`;

  return { productNamePart };
};

const handleVariations = (
  payload: TProduct,
  productNamePart: string,
  vendorCategory: any,
) => {
  if (!payload.variations?.length) return;

  let totalStock = 0;
  let minPrice = Infinity;

  payload.variations = payload.variations.map((variation) => ({
    ...variation,
    options: variation.options.map((option) => {
      const price = option.price;
      const stock = option.stockQuantity || 0;

      if (price < minPrice) minPrice = price;
      totalStock += stock;

      // 🛠️ আপডেট: option.label.en ব্যবহার করে ভেরিয়েশন SKU জেনারেট করা হচ্ছে
      const variationLabelPart = cleanForSKU(option.label.en || '');

      return {
        ...option,
        price,
        sku:
          option.sku ||
          `VAR-${productNamePart}-${variationLabelPart}-${customNanoId(3)}`,
        stockQuantity: stock,
        totalAddedQuantity: stock,
        isOutOfStock: stock <= 0,
      };
    }),
  }));

  payload.pricing.price = minPrice === Infinity ? 0 : minPrice;

  if (
    vendorCategory?.name !== BusinessCategoryName.RESTAURANT &&
    payload.stock
  ) {
    payload.stock.quantity = totalStock;
    payload.stock.totalAddedQuantity = totalStock;
    payload.stock.hasVariations = true;
  }
};

const handleSimpleStock = (payload: TProduct, vendorCategory: any) => {
  if (!payload.variations?.length) {
    if (
      vendorCategory?.name !== BusinessCategoryName.RESTAURANT &&
      payload.stock
    ) {
      payload.stock.hasVariations = false;
      payload.stock.totalAddedQuantity = payload.stock.quantity;
    }
  }
};

export const CreateProductUtils = {
  validateVendor,
  validateBasePayload,
  validateCategory,
  validateRestaurantStock,
  validateAddons,
  applyTax,
  prepareBasicFields,
  handleVariations,
  handleSimpleStock,
};
