/* eslint-disable @typescript-eslint/no-explicit-any */
import httpStatus from 'http-status';
import AppError from '../../errors/AppError';
import { Tax } from '../Tax/tax.model';
import { BusinessCategoryName } from '../Category/category.interface';
import { cleanForSKU, generateSlug } from './product.utils';
import { TProduct } from './product.interface';
import { Product } from './product.model';
import { TAuthUser } from '../AuthUser/authUser.interface';
import { AuthUser } from '../AuthUser/authUser.model';
import { Vendor } from '../Vendor/vendor.model';
import customNanoId from '../../utils/customNanoId';

const getAndValidateProduct = async (
  productId: string,
  currentUser: TAuthUser,
) => {
  const product = await Product.findOne({
    productId,
    ...(currentUser.role === 'VENDOR' && { vendorId: currentUser._id }),
  });

  if (!product) throw new AppError(httpStatus.NOT_FOUND, 'Product not found');

  if (currentUser?.status !== 'APPROVED') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'Action forbidden. Your account is not approved.',
    );
  }

  return product;
};

const getVendorBusinessType = async (vendorAuthId: any) => {
  const authUser = await AuthUser.findById(vendorAuthId).lean();
  if (!authUser || !authUser.userObjectId) return null;

  const vendorProfile = await Vendor.findById(authUser.userObjectId).lean();
  return vendorProfile?.businessDetails?.businessType || null;
};

const prepareUpdateData = async (
  payload: Partial<TProduct>,
  vendorBusinessType: string | null,
  currentProductName: string,
) => {
  const modifiedData: Record<string, any> = {};
  const isRestaurant = vendorBusinessType === BusinessCategoryName.RESTAURANT;

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
      if (!tax)
        throw new AppError(httpStatus.NOT_FOUND, 'Tax template not found');
      modifiedData['pricing.taxId'] = taxId;
      modifiedData['pricing.taxRate'] = tax.taxRate;
    }
  }

  if (payload.stock && !isRestaurant) {
    if (payload.stock.unit) modifiedData['stock.unit'] = payload.stock.unit;
    if (payload.stock.quantity !== undefined) {
      modifiedData['stock.quantity'] = payload.stock.quantity;
      modifiedData['stock.totalAddedQuantity'] = payload.stock.quantity;
    }
  }

  if (payload.variations?.length) {
    const targetName = payload.name || currentProductName;
    const productNamePart = cleanForSKU(targetName);

    modifiedData.variations = payload.variations.map((variation: any) => ({
      ...variation,
      options: variation.options.map((option: any) => {
        if (isRestaurant) {
          return {
            label: option.label,
            price: option.price,
            sku:
              option.sku ||
              `VAR-${productNamePart}-${cleanForSKU(option.label)}-${customNanoId(3).toUpperCase()}`,
            isOutOfStock: option.isOutOfStock ?? false,
          };
        }
        return {
          ...option,
          sku:
            option.sku ||
            `VAR-${productNamePart}-${cleanForSKU(option.label)}-${customNanoId(3).toUpperCase()}`,
        };
      }),
    }));
  }

  if (payload.meta) {
    Object.keys(payload.meta).forEach((key) => {
      modifiedData[`meta.${key}`] = (payload.meta as any)[key];
    });
  }

  return modifiedData;
};

const syncStockStatus = async (
  updatedProduct: any,
  vendorBusinessType: string | null,
) => {
  if (
    updatedProduct &&
    vendorBusinessType !== BusinessCategoryName.RESTAURANT &&
    updatedProduct.stock
  ) {
    const finalQty = updatedProduct.stock.quantity;
    updatedProduct.stock.availabilityStatus =
      finalQty > 0 ? (finalQty < 5 ? 'Limited' : 'In Stock') : 'Out of Stock';

    await Product.updateOne(
      { _id: updatedProduct._id },
      {
        $set: {
          'stock.availabilityStatus': updatedProduct.stock.availabilityStatus,
        },
      },
    );
  }
};
export const UpdateProductUtils = {
  getAndValidateProduct,
  getVendorBusinessType,
  prepareUpdateData,
  syncStockStatus,
};
