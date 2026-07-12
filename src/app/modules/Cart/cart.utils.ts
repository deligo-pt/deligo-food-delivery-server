/* eslint-disable @typescript-eslint/no-explicit-any */
import httpStatus from 'http-status';
import { TLanguageCode } from '../../constant/GlobalInterface/language.interface';
import AppError from '../../errors/AppError';
import { Product } from '../Product/product.model';
import { roundTo2 } from '../../utils/mathProvider';

export const formatCartResponse = (
  cartData: any,
  lang: TLanguageCode = 'en',
) => {
  if (!cartData || !cartData.items) return cartData;

  const transformedCart = JSON.parse(JSON.stringify(cartData));

  transformedCart.items = transformedCart.items.map((item: any) => {
    if (item.name && typeof item.name === 'object') {
      item.name = item.name[lang] || item.name['en'] || '';
    }

    if (item.product) {
      if (item.product.name) {
        item.product.name =
          typeof item.product.name === 'object'
            ? item.product.name[lang] || item.product.name['en'] || ''
            : item.product.name;
      }
      if (item.product.description) {
        item.product.description =
          typeof item.product.description === 'object'
            ? item.product.description[lang] ||
              item.product.description['en'] ||
              ''
            : item.product.description;
      }
    }

    if (item.addons && Array.isArray(item.addons)) {
      item.addons = item.addons.map((addon: any) => {
        if (addon.name && typeof addon.name === 'object') {
          addon.name = addon.name[lang] || addon.name['en'] || '';
        } else if (
          addon.addonId &&
          addon.addonId.name &&
          typeof addon.addonId.name === 'object'
        ) {
          addon.name =
            addon.addonId.name[lang] || addon.addonId.name['en'] || '';
        }
        return addon;
      });
    }

    return item;
  });

  return transformedCart;
};

export const refreshItemPricingAndTotals = async (item: any) => {
  const product = await Product.findOne({
    _id: item.productId,
    isDeleted: false,
    isApproved: true,
  }).lean();
  if (!product) throw new AppError(httpStatus.NOT_FOUND, 'PRODUCT_UNAVAILABLE');

  const pNameEn = product.name?.en || '';
  const pNamePt = product.name?.pt || pNameEn;
  const finalItemName = { en: pNameEn, pt: pNamePt };

  let selectedPrice = product.pricing.price;
  let selectedVariantLabel: any = null;
  const hasVariations =
    product?.stock?.hasVariations === true ||
    (product?.variations && product.variations.length > 0);

  if (item.variationSku && hasVariations) {
    const targetOption = product.variations
      ?.flatMap((v: any) => v.options)
      .find((opt: any) => opt.sku === item.variationSku);

    if (targetOption) {
      selectedPrice = targetOption.price;
      selectedVariantLabel = targetOption.label;
    }

    const vLabelEn =
      typeof selectedVariantLabel === 'object'
        ? selectedVariantLabel.en || ''
        : selectedVariantLabel;
    const vLabelPt =
      typeof selectedVariantLabel === 'object'
        ? selectedVariantLabel.pt || vLabelEn
        : selectedVariantLabel;

    if (vLabelEn) finalItemName.en = `${pNameEn} - ${vLabelEn}`;
    if (vLabelPt) finalItemName.pt = `${pNamePt} - ${vLabelPt}`;
  }

  item.name = finalItemName;

  const {
    discount = 0,
    discountType = 'PERCENTAGE',
    taxRate = 0,
  } = product.pricing;
  const unitDiscountAmount =
    discountType === 'FLAT'
      ? roundTo2(discount)
      : roundTo2((selectedPrice * discount) / 100);
  const priceAfterDiscount = roundTo2(selectedPrice - unitDiscountAmount);

  const productLineTotal = roundTo2(
    priceAfterDiscount * item.itemSummary.quantity,
  );
  const productTaxAmount = roundTo2(
    (productLineTotal * taxRate) / (100 + taxRate),
  );

  const existingAddonsNet =
    item.addons?.reduce((sum: number, a: any) => sum + (a.lineTotal || 0), 0) ||
    0;
  const existingAddonsTax =
    item.addons?.reduce((sum: number, a: any) => sum + (a.taxAmount || 0), 0) ||
    0;

  item.productPricing.originalPrice = roundTo2(selectedPrice);
  item.productPricing.productDiscountAmount = unitDiscountAmount;
  item.productPricing.discountType = discountType;
  item.productPricing.unitPrice = priceAfterDiscount;
  item.productPricing.lineTotal = productLineTotal;
  item.productPricing.taxRate = taxRate;
  item.productPricing.taxAmount = productTaxAmount;

  item.itemSummary.totalTaxAmount = roundTo2(
    productTaxAmount + existingAddonsTax,
  );
  item.itemSummary.totalProductDiscount = roundTo2(
    unitDiscountAmount * item.itemSummary.quantity,
  );
  item.itemSummary.grandTotal = roundTo2(productLineTotal + existingAddonsNet);
};
