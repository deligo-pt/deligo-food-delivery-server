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

const validateVendor = (currentUser: TCurrentUser) => {
  if (currentUser?.status !== 'APPROVED') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'VENDOR_NOT_APPROVED_TO_ADD_PRODUCTS',
    );
  }
};

const validateBasePayload = (payload: TProduct) => {
  if (!payload.variations && !payload.pricing.price) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'PRICE_REQUIRED_WHEN_NO_VARIATIONS',
    );
  }
};

const validateCategory = (vendorCategoryExist: any, category: any) => {
  if (!category) {
    throw new AppError(httpStatus.NOT_FOUND, 'CATEGORY_NOT_FOUND');
  }

  if (
    category.businessCategoryId.toString() !==
    vendorCategoryExist?._id.toString()
  ) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'CATEGORY_NOT_UNDER_BUSINESS_TYPE',
    );
  }
};

const validateRestaurantStock = (
  vendorCategoryExist: any,
  payload: TProduct,
) => {
  const isRestaurant =
    vendorCategoryExist?.name?.en === BusinessCategoryName.RESTAURANT;

  if (isRestaurant) {
    if (payload.stock && (payload.stock.quantity || 0) > 0) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'STOCK_MANAGEMENT_NOT_ALLOWED_FOR_RESTAURANTS',
      );
    }

    payload.stock = undefined;
  }
};

const validateAddons = async (
  payload: Partial<TProduct>,
  vendorId: Types.ObjectId,
) => {
  if (!payload.addonGroups?.length) return;

  const validAddonsCount = await AddonGroup.countDocuments({
    _id: { $in: payload.addonGroups },
    vendorId,
    isDeleted: false,
  });

  if (validAddonsCount !== payload.addonGroups.length) {
    throw new AppError(httpStatus.BAD_REQUEST, 'INVALID_ADDON_GROUPS');
  }
};

const applyTax = async (payload: TProduct) => {
  if (!payload.pricing.taxId) return;

  const tax: TTax | null = await Tax.findById(payload.pricing.taxId);
  if (!tax) throw new AppError(httpStatus.NOT_FOUND, 'TAX_NOT_FOUND');

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
  const isRestaurant =
    vendorCategory?.name?.en === BusinessCategoryName.RESTAURANT;
  let totalStock = 0;
  let minPrice = Infinity;

  payload.variations = payload.variations.map((variation) => ({
    ...variation,
    options: variation.options.map((option) => {
      const price = option.price;

      if (isRestaurant && (option.stockQuantity || 0) > 0) {
        throw new AppError(
          httpStatus.BAD_REQUEST,
          'VARIATION_STOCK_NOT_ALLOWED_FOR_RESTAURANTS',
        );
      }

      const stock = isRestaurant ? 0 : option.stockQuantity || 0;

      if (price < minPrice) minPrice = price;
      totalStock += stock;

      const variationLabelPart = cleanForSKU(option.label.en || '');

      const cleanOption: any = {
        ...option,
        price,
        sku:
          option.sku ||
          `VAR-${productNamePart}-${variationLabelPart}-${customNanoId(3)}`,
      };

      if (!isRestaurant) {
        cleanOption.stockQuantity = stock;
        cleanOption.totalAddedQuantity = stock;
        cleanOption.isOutOfStock = stock <= 0;
      } else {
        delete cleanOption.stockQuantity;
        delete cleanOption.totalAddedQuantity;
        delete cleanOption.isOutOfStock;
      }

      return cleanOption;
    }),
  }));

  payload.pricing.price = minPrice === Infinity ? 0 : minPrice;

  if (!isRestaurant && payload.stock) {
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
