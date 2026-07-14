/* eslint-disable @typescript-eslint/no-explicit-any */
import httpStatus from 'http-status';
import AppError from '../../errors/AppError';
import { Product } from '../Product/product.model';
import { TCartItemInput } from './cart.interface';
import { Cart } from './cart.model';
import { getPopulateOptions } from '../../utils/getPopulateOptions';
import { recalculateCartTotals } from './cart.constant';
import { Vendor } from '../Vendor/vendor.model';
import { QueryBuilder } from '../../builder/QueryBuilder';
import { roundTo2 } from '../../utils/mathProvider';
import { TCurrentUser } from '../../constant/GlobalInterface/user.interface';
import { TLanguageCode } from '../../constant/GlobalInterface/language.interface';
import { RedisService } from '../../config/redis';
import { formatCartResponse, refreshItemPricingAndTotals } from './cart.utils';
import { BusinessCategoryName } from '../Category/category.interface';
import { BusinessCategory } from '../Category/category.model';

// Add cart Service
const addToCart = async (
  payload: TCartItemInput,
  currentUser: TCurrentUser,
) => {
  if (currentUser.role !== 'CUSTOMER') {
    throw new AppError(httpStatus.FORBIDDEN, 'CUSTOMER_ONLY_ACTION');
  }
  if (currentUser.status !== 'APPROVED') {
    throw new AppError(httpStatus.FORBIDDEN, 'ACCOUNT_UNAPPROVED');
  }

  const customerId = currentUser._id;
  const inputItem = payload.items[0];
  if (!inputItem)
    throw new AppError(httpStatus.BAD_REQUEST, 'NO_ITEMS_PROVIDED');

  const { productId, variationSku } = inputItem;
  const inputQuantity = Number(inputItem.quantity) || 1;

  const existingProduct = await Product.findOne({
    _id: productId,
    isDeleted: false,
    isApproved: true,
  });

  if (!existingProduct)
    throw new AppError(httpStatus.NOT_FOUND, 'PRODUCT_NOT_FOUND');

  const existingVendor = await Vendor.findOne({
    _id: existingProduct.vendorId,
    isDeleted: false,
  }).populate('businessDetails.businessType');

  if (
    !existingVendor ||
    existingVendor?.businessDetails?.isStoreOpen === false
  ) {
    throw new AppError(httpStatus.BAD_REQUEST, 'STORE_CLOSED_OR_UNAPPROVED');
  }

  const isRestaurant =
    (existingVendor?.businessDetails?.businessType as any)?.name?.en ===
    BusinessCategoryName.RESTAURANT;

  let selectedPrice = existingProduct.pricing.price;
  let selectedVariantLabel: any = null;
  let availableStock = existingProduct?.stock?.quantity ?? 0;
  let finalVariationSku = variationSku || null;

  const hasVariations =
    existingProduct?.stock?.hasVariations === true ||
    (existingProduct?.variations && existingProduct.variations.length > 0);

  if (hasVariations) {
    if (!variationSku) {
      throw new AppError(httpStatus.BAD_REQUEST, 'VARIATION_REQUIRED');
    }
    const targetOption = existingProduct.variations
      ?.flatMap((v: any) => v.options)
      .find((opt: any) => opt.sku === variationSku);

    if (!targetOption)
      throw new AppError(httpStatus.NOT_FOUND, 'INVALID_VARIATION_SKU');

    selectedPrice = targetOption.price;
    selectedVariantLabel = targetOption.label;
    availableStock = targetOption.stockQuantity ?? 0;
    finalVariationSku = targetOption.sku;
  } else {
    if (variationSku) {
      throw new AppError(httpStatus.BAD_REQUEST, 'VARIATIONS_NOT_SUPPORTED');
    }
    finalVariationSku = null;
  }

  if (!isRestaurant && inputQuantity > availableStock)
    throw new AppError(httpStatus.BAD_REQUEST, 'INSUFFICIENT_STOCK');

  const {
    discount = 0,
    discountType = 'PERCENTAGE',
    taxRate = 0,
  } = existingProduct.pricing;

  let unitDiscountAmount = 0;
  if (discountType === 'FLAT') {
    unitDiscountAmount = roundTo2(discount);
  } else {
    unitDiscountAmount = roundTo2((selectedPrice * discount) / 100);
  }

  const priceAfterDiscount = roundTo2(selectedPrice - unitDiscountAmount);

  const productLineTotal = roundTo2(priceAfterDiscount * inputQuantity);
  const productTaxAmount = roundTo2(
    (productLineTotal * taxRate) / (100 + taxRate),
  );

  const pNameEn = existingProduct.name?.en || '';
  const pNamePt = existingProduct.name?.pt || pNameEn;

  const finalItemName = { en: pNameEn, pt: pNamePt };

  if (selectedVariantLabel) {
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

  const newItem: any = {
    productId: existingProduct._id,
    vendorId: existingProduct.vendorId,
    name: finalItemName,
    image: existingProduct?.images[0] || '',
    hasVariations: hasVariations,
    variationSku: finalVariationSku,
    isActive: true,
    addons: [],
    productPricing: {
      originalPrice: roundTo2(selectedPrice),
      productDiscountAmount: unitDiscountAmount,
      discountType,
      unitPrice: priceAfterDiscount,
      lineTotal: productLineTotal,
      taxRate,
      taxAmount: productTaxAmount,
    },
    itemSummary: {
      quantity: inputQuantity,
      totalTaxAmount: productTaxAmount,
      totalProductDiscount: roundTo2(unitDiscountAmount * inputQuantity),
      grandTotal: productLineTotal,
    },
  };

  const customerIdStr = customerId.toString();
  const dataKey = `cart:data:${customerIdStr}`;
  const expiryKey = `cart:expiry:${customerIdStr}`;

  let cart = await RedisService.get<any>(dataKey);
  if (!cart) {
    const dbCart = await Cart.findOne({ customerId, isDeleted: false }).lean();
    if (dbCart) cart = dbCart;
  }

  if (!cart) {
    cart = {
      customerId: customerId,
      items: [newItem],
      totalItems: 1,
      totalQuantity: inputQuantity,
      cartCalculation: {
        totalOriginalPrice: 0,
        totalProductDiscount: 0,
        totalTaxAmount: 0,
        grandTotal: 0,
      },
      status: 'active',
      isDeleted: false,
    };
  } else {
    const itemIndex = cart.items.findIndex(
      (i: any) =>
        i.productId.toString() === productId.toString() &&
        (i.variationSku || null) === (finalVariationSku || null),
    );

    if (itemIndex > -1) {
      const currentItem = cart.items[itemIndex];
      currentItem.name = finalItemName;

      if (!isRestaurant && inputQuantity > availableStock) {
        throw new AppError(
          httpStatus.BAD_REQUEST,
          'INSUFFICIENT_STOCK_WITH_QUANTITY',
          { quantity: currentItem.itemSummary.quantity },
        );
      }

      const newProductLineTotal = roundTo2(priceAfterDiscount * inputQuantity);
      const newProductTax = roundTo2(
        (newProductLineTotal * taxRate) / (100 + taxRate),
      );

      const existingAddonsNet =
        currentItem.addons?.reduce(
          (sum: number, a: any) => sum + (a.lineTotal || 0),
          0,
        ) || 0;
      const existingAddonsTax =
        currentItem.addons?.reduce(
          (sum: number, a: any) => sum + (a.taxAmount || 0),
          0,
        ) || 0;

      currentItem.productPricing.originalPrice = roundTo2(selectedPrice);
      currentItem.productPricing.productDiscountAmount = unitDiscountAmount;
      currentItem.productPricing.discountType = discountType;
      currentItem.productPricing.unitPrice = priceAfterDiscount;

      currentItem.itemSummary.quantity = inputQuantity;
      currentItem.productPricing.lineTotal = newProductLineTotal;
      currentItem.productPricing.taxAmount = newProductTax;
      currentItem.itemSummary.totalProductDiscount = roundTo2(
        unitDiscountAmount * inputQuantity,
      );
      currentItem.itemSummary.totalTaxAmount = roundTo2(
        newProductTax + existingAddonsTax,
      );
      currentItem.itemSummary.grandTotal = roundTo2(
        newProductLineTotal + existingAddonsNet,
      );
    } else {
      const activeItem = cart.items.find((i: any) => i.isActive === true);
      if (
        activeItem &&
        activeItem.vendorId.toString() !== existingProduct.vendorId.toString()
      ) {
        newItem.isActive = false;
      }
      cart.items.push(newItem);
    }
  }

  await recalculateCartTotals(cart);

  await RedisService.set(dataKey, cart, 259200);
  await RedisService.set(expiryKey, '', 86400);

  Cart.updateOne(
    { customerId },
    {
      items: cart.items,
      cartCalculation: cart.cartCalculation,
      totalItems: cart.totalItems,
      totalQuantity: cart.totalQuantity,
      status: 'active',
      isNotified: false,
    },
    { upsert: true },
  ).catch((err) => console.error('Background DB Sync Failed:', err));

  return { messageKey: 'ADD_TO_CART_SUCCESS', data: cart };
};

// toggle cart item status service
const toggleCartItemStatus = async (
  currentUser: TCurrentUser,
  payload: {
    toggleMode: 'ITEM_LEVEL' | 'VENDOR_BULK';
    vendorId?: string;
    productIds?: string[];
    variationSku?: string[];
  },
) => {
  if (currentUser.status !== 'APPROVED') {
    throw new AppError(httpStatus.FORBIDDEN, 'CART_UPDATE_RESTRICTED', {
      status: currentUser.status,
    });
  }

  const { toggleMode, vendorId, productIds, variationSku } = payload;

  const customerId = currentUser._id;
  const customerIdStr = customerId.toString();
  const dataKey = `cart:data:${customerIdStr}`;
  const expiryKey = `cart:expiry:${customerIdStr}`;

  let cart = await RedisService.get<any>(dataKey);
  if (!cart) {
    const dbCart = await Cart.findOne({ customerId, isDeleted: false }).lean();
    if (dbCart) cart = dbCart;
  }

  if (!cart || !cart.items || cart.items.length === 0) {
    throw new AppError(httpStatus.NOT_FOUND, 'CART_NOT_FOUND');
  }

  let isFinalStateActive = false;

  if (toggleMode === 'VENDOR_BULK') {
    if (!vendorId)
      throw new AppError(httpStatus.BAD_REQUEST, 'VENDOR_ID_REQUIRED_FOR_BULK');

    const targetVendorIdStr = vendorId.toString();
    const hasVendorItems = cart.items.some(
      (i: any) => i.vendorId.toString() === targetVendorIdStr,
    );
    if (!hasVendorItems)
      throw new AppError(
        httpStatus.NOT_FOUND,
        'NO_ITEMS_FOUND_FOR_THIS_VENDOR',
      );

    const anyActive = cart.items.some(
      (i: any) => i.vendorId.toString() === targetVendorIdStr && i.isActive,
    );
    const determineActiveState = !anyActive;
    isFinalStateActive = determineActiveState;

    if (determineActiveState) {
      cart.items.forEach((item: any) => {
        if (item.vendorId.toString() !== targetVendorIdStr) {
          item.isActive = false;
        }
      });
    }

    for (const item of cart.items) {
      if (item.vendorId.toString() === targetVendorIdStr) {
        if (determineActiveState) {
          await refreshItemPricingAndTotals(item);
        }
        item.isActive = determineActiveState;
      }
    }
  } else if (toggleMode === 'ITEM_LEVEL') {
    let itemsToToggle: any[] = [];

    if (Array.isArray(productIds) && productIds.length > 0) {
      const stringProductIds = productIds.map((id) => id.toString());
      itemsToToggle = cart.items.filter(
        (i: any) =>
          stringProductIds.includes(i.productId.toString()) && !i.variationSku,
      );
    } else if (Array.isArray(variationSku) && variationSku.length > 0) {
      itemsToToggle = cart.items.filter(
        (i: any) => i.variationSku && variationSku.includes(i.variationSku),
      );
    }

    if (itemsToToggle.length === 0) {
      throw new AppError(httpStatus.NOT_FOUND, 'PRODUCT_NOT_IN_CART');
    }

    const willBeActive = !itemsToToggle[0].isActive;
    isFinalStateActive = willBeActive;

    if (willBeActive) {
      const selectedVendorId = itemsToToggle[0].vendorId.toString();

      const activeItems = cart.items.filter((i: any) => i.isActive === true);
      if (activeItems.length > 0) {
        const activeVendorId = activeItems[0].vendorId;
        if (activeVendorId.toString() !== selectedVendorId) {
          throw new AppError(httpStatus.BAD_REQUEST, 'MULTIPLE_VENDORS_DENIED');
        }
      }

      for (const item of itemsToToggle) {
        await refreshItemPricingAndTotals(item);
      }
    }

    itemsToToggle.forEach((item: any) => {
      item.isActive = willBeActive;
    });
  }

  await recalculateCartTotals(cart);

  await RedisService.set(dataKey, cart, 259200);
  await RedisService.set(expiryKey, '', 86400);

  // Background Database Async Sync Pipeline
  Cart.updateOne(
    { customerId },
    {
      items: cart.items,
      cartCalculation: cart.cartCalculation,
      totalItems: cart.totalItems,
      totalQuantity: cart.totalQuantity,
      status: 'active',
      isNotified: false,
    },
    { upsert: true },
  ).catch((err) => console.error('Background DB Sync Failed:', err));

  return {
    messageKey: isFinalStateActive
      ? 'TOGGLE_ITEM_ACTIVE_SUCCESS'
      : 'TOGGLE_ITEM_DEACTIVE_SUCCESS',
    data: cart,
  };
};

// update add on quantity Service
const updateAddonQuantity = async (
  currentUser: TCurrentUser,
  payload: {
    productId: string;
    variationSku?: string;
    optionSku: string;
    quantity: number;
  },
  lang: TLanguageCode,
) => {
  if (currentUser.status !== 'APPROVED') {
    throw new AppError(httpStatus.FORBIDDEN, 'CART_UPDATE_RESTRICTED', {
      status: currentUser.status,
    });
  }

  const { productId, variationSku, optionSku, quantity } = payload;

  const inputQuantity = Math.max(0, Math.floor(Number(quantity) || 0));

  const customerId = currentUser._id;
  const customerIdStr = customerId.toString();
  const dataKey = `cart:data:${customerIdStr}`;
  const expiryKey = `cart:expiry:${customerIdStr}`;

  let cart = await RedisService.get<any>(dataKey);

  if (!cart) {
    const dbCart = await Cart.findOne({ customerId, isDeleted: false }).lean();
    if (dbCart) {
      cart = dbCart;
    }
  }

  if (!cart) throw new AppError(httpStatus.NOT_FOUND, 'CART_NOT_FOUND');

  const itemIndex = cart.items.findIndex((i: any) => {
    const isSameProduct = i.productId.toString() === productId.toString();
    const currentItemSku = i.variationSku || null;
    const inputSku = variationSku || null;
    return isSameProduct && currentItemSku === inputSku;
  });

  if (itemIndex === -1)
    throw new AppError(httpStatus.NOT_FOUND, 'PRODUCT_NOT_IN_CART');

  const targetItem = cart.items[itemIndex] as any;
  if (!targetItem.addons) {
    targetItem.addons = [] as any[];
  }

  const product = await Product.findById(productId)
    .populate({
      path: 'addonGroups',
      populate: {
        path: 'options.tax',
      },
    })
    .lean();

  if (!product) throw new AppError(httpStatus.NOT_FOUND, 'PRODUCT_NOT_FOUND');

  let selectedPrice = product.pricing.price;
  let selectedVariantLabel: any = null;
  const hasVariations =
    product?.stock?.hasVariations === true ||
    (product?.variations && product.variations.length > 0);

  if (targetItem.variationSku && hasVariations) {
    const targetOption = product.variations
      ?.flatMap((v: any) => v.options)
      .find((opt: any) => opt.sku === targetItem.variationSku);

    if (targetOption) {
      selectedPrice = targetOption.price;
      selectedVariantLabel = targetOption.label;
    }
  }

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
    priceAfterDiscount * targetItem.itemSummary.quantity,
  );
  const productTaxAmount = roundTo2(
    (productLineTotal * taxRate) / (100 + taxRate),
  );

  targetItem.productPricing.originalPrice = roundTo2(selectedPrice);
  targetItem.productPricing.productDiscountAmount = unitDiscountAmount;
  targetItem.productPricing.discountType = discountType;
  targetItem.productPricing.unitPrice = priceAfterDiscount;
  targetItem.productPricing.lineTotal = productLineTotal;
  targetItem.productPricing.taxRate = taxRate;
  targetItem.productPricing.taxAmount = productTaxAmount;

  const pNameEn = product.name?.en || '';
  const pNamePt = product.name?.pt || pNameEn;
  const finalItemName = { en: pNameEn, pt: pNamePt };

  if (selectedVariantLabel) {
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
  targetItem.name = finalItemName;

  let addonData: any = null;
  let parentGroup: any = null;

  ((product.addonGroups as any[]) || []).forEach((group) => {
    if (group.isActive && !group.isDeleted) {
      const option = group.options.find((opt: any) => opt.sku === optionSku);
      if (option && option.isActive) {
        addonData = {
          name: {
            en: option.name?.en || '',
            pt: option.name?.pt || option.name?.en || '',
          },
          sku: option.sku,
          unitPrice: option.price,
          taxRate: option.tax?.taxRate || 0,
        };
        parentGroup = group;
      }
    }
  });

  if (!addonData)
    throw new AppError(httpStatus.BAD_REQUEST, 'ADDON_UNAVAILABLE');

  const existingAddonIndex = targetItem.addons.findIndex(
    (a: any) => a.sku === addonData.sku,
  );

  if (inputQuantity > 0) {
    const groupOptionSkus = parentGroup.options.map((o: any) => o.sku);

    const otherAddonsSelectionCount = targetItem.addons
      .filter(
        (a: any) => a.sku !== addonData.sku && groupOptionSkus.includes(a.sku),
      )
      .reduce((sum: number, a: any) => sum + a.quantity, 0);

    if (otherAddonsSelectionCount + inputQuantity > parentGroup.maxSelectable) {
      const groupTitleObj = parentGroup.title as Record<string, string>;
      const localizedGroupTitle =
        groupTitleObj?.[lang] || groupTitleObj?.['en'] || 'this group';
      throw new AppError(httpStatus.BAD_REQUEST, 'ADDON_LIMIT_REACHED', {
        max: parentGroup.maxSelectable,
        group: localizedGroupTitle,
      });
    }

    if (existingAddonIndex > -1) {
      targetItem.addons[existingAddonIndex].quantity = inputQuantity;
    } else {
      const initialTaxAmount = roundTo2(
        (addonData.unitPrice * addonData.taxRate) / (100 + addonData.taxRate),
      );
      targetItem.addons.push({
        ...addonData,
        originalPrice: addonData.unitPrice,
        quantity: inputQuantity,
        lineTotal: addonData.unitPrice,
        taxAmount: initialTaxAmount,
      });
    }
  } else {
    if (existingAddonIndex > -1) {
      targetItem.addons.splice(existingAddonIndex, 1);
    }
  }

  let totalAddonsNet = 0;
  let totalAddonsTax = 0;

  targetItem.addons.forEach((addon: any) => {
    const aUnitPrice = Number(addon.unitPrice) || 0;
    const aQty = Number(addon.quantity) || 0;
    const aTaxRate = Number(addon.taxRate) || 0;

    const addonLineTotal = roundTo2(aUnitPrice * aQty);
    const addonTaxAmount = roundTo2(
      (addonLineTotal * aTaxRate) / (100 + aTaxRate),
    );

    addon.lineTotal = addonLineTotal;
    addon.taxAmount = addonTaxAmount;

    totalAddonsNet += addonLineTotal;
    totalAddonsTax += addonTaxAmount;
  });

  const mainProductNet = targetItem.productPricing.lineTotal;
  const mainProductTax = targetItem.productPricing.taxAmount;

  targetItem.itemSummary.totalTaxAmount = roundTo2(
    mainProductTax + totalAddonsTax,
  );
  targetItem.itemSummary.totalProductDiscount = roundTo2(
    unitDiscountAmount * targetItem.itemSummary.quantity,
  );
  targetItem.itemSummary.grandTotal = roundTo2(mainProductNet + totalAddonsNet);

  await recalculateCartTotals(cart);

  await RedisService.set(dataKey, cart, 259200);
  await RedisService.set(expiryKey, '', 86400);

  Cart.updateOne(
    { customerId },
    {
      items: cart.items,
      cartCalculation: cart.cartCalculation,
      totalItems: cart.totalItems,
      totalQuantity: cart.totalQuantity,
      status: 'active',
      isNotified: false,
    },
    { upsert: true },
  ).catch((err) => console.error('Background DB Sync Failed:', err));

  const formattedCart =
    typeof formatCartResponse === 'function'
      ? formatCartResponse(cart, lang)
      : cart;

  return {
    messageKey: 'ADDON_QUANTITY_UPDATE_SUCCESS',
    data: formattedCart,
  };
};

// delete cart item
const deleteCartItem = async (
  currentUser: TCurrentUser,
  itemsToDelete: { productId: string; variationSku?: string }[],
) => {
  if (currentUser.status !== 'APPROVED') {
    throw new AppError(httpStatus.FORBIDDEN, 'CART_UPDATE_RESTRICTED', {
      status: currentUser.status,
    });
  }

  const customerId = currentUser._id;
  const customerIdStr = customerId.toString();
  const dataKey = `cart:data:${customerIdStr}`;
  const expiryKey = `cart:expiry:${customerIdStr}`;

  let cart = await RedisService.get<any>(dataKey);

  if (!cart) {
    const dbCart = await Cart.findOne({ customerId, isDeleted: false }).lean();
    if (dbCart) {
      cart = dbCart;
    }
  }

  if (!cart || !cart.items || cart.items.length === 0) {
    throw new AppError(httpStatus.NOT_FOUND, 'CART_EMPTY');
  }

  const initialLength = cart.items.length;

  cart.items = cart.items.filter((cartItem: any) => {
    const isTargetedForDeletion = itemsToDelete.some((target) => {
      const isSameProduct = target.productId === cartItem.productId.toString();
      const inputSku = target.variationSku || null;
      const dbSku = cartItem.variationSku || null;

      return isSameProduct && dbSku === inputSku;
    });

    return !isTargetedForDeletion;
  });

  if (cart.items.length === initialLength) {
    throw new AppError(httpStatus.NOT_FOUND, 'REMOVE_ITEMS_NOT_FOUND');
  }

  if (cart.items.length === 0) {
    await RedisService.del(dataKey);
    await RedisService.del(expiryKey);

    await Cart.deleteOne({ customerId });

    return {
      messageKey: 'REMOVE_ITEMS_SUCCESS',
      data: {
        customerId,
        items: [],
        totalItems: 0,
        totalQuantity: 0,
        cartCalculation: {
          totalOriginalPrice: 0,
          totalProductDiscount: 0,
          totalTaxAmount: 0,
          grandTotal: 0,
        },
        isDeleted: false,
      },
    };
  }

  await recalculateCartTotals(cart);

  await RedisService.set(dataKey, cart, 259200);
  await RedisService.set(expiryKey, '', 86400);

  Cart.updateOne(
    { customerId },
    {
      items: cart.items,
      cartCalculation: cart.cartCalculation,
      totalItems: cart.totalItems,
      totalQuantity: cart.totalQuantity,
      status: 'active',
      isNotified: false,
    },
    { upsert: true },
  ).catch((err) => console.error('Background DB Sync Failed:', err));

  return {
    messageKey: 'REMOVE_ITEMS_SUCCESS',
    data: cart,
  };
};

// clear cart Service
const clearCart = async (currentUser: TCurrentUser) => {
  if (currentUser.status !== 'APPROVED') {
    throw new AppError(httpStatus.FORBIDDEN, 'CART_UPDATE_RESTRICTED', {
      status: currentUser.status,
    });
  }

  const customerId = currentUser._id;
  const customerIdStr = customerId.toString();
  const dataKey = `cart:data:${customerIdStr}`;
  const expiryKey = `cart:expiry:${customerIdStr}`;

  const cartExists = await RedisService.exists(dataKey);

  if (!cartExists) {
    const dbCart = await Cart.findOne({ customerId, isDeleted: false });
    if (!dbCart) {
      throw new AppError(httpStatus.NOT_FOUND, 'CART_NOT_FOUND');
    }
  }

  await RedisService.del(dataKey);
  await RedisService.del(expiryKey);

  await Cart.deleteOne({ customerId });

  return {
    messageKey: 'CLEAR_CART_SUCCESS',
    data: {
      customerId,
      items: [],
      totalItems: 0,
      totalQuantity: 0,
      cartCalculation: {
        totalOriginalPrice: 0,
        totalProductDiscount: 0,
        totalTaxAmount: 0,
        grandTotal: 0,
      },
      isDeleted: false,
    },
  };
};

// get all cart service
const getAllCart = async (
  currentUser: TCurrentUser,
  query: Record<string, unknown>,
  lang: TLanguageCode = 'en',
) => {
  if (currentUser.status !== 'APPROVED') {
    throw new AppError(httpStatus.FORBIDDEN, 'CART_VIEW_RESTRICTED', {
      status: currentUser.status,
    });
  }

  const redisKeys = await RedisService.keys('cart:data:*');
  let redisCarts: any[] = [];

  if (redisKeys && redisKeys.length > 0) {
    for (const key of redisKeys) {
      const cartData = await RedisService.get<any>(key);
      if (cartData && cartData.items && cartData.items.length > 0) {
        if (cartData.cartCalculation) {
          delete cartData.cartCalculation.taxableAmount;
          delete cartData.cartCalculation.subtotal;
        }

        redisCarts.push({
          ...cartData,
          createdAt: cartData.createdAt || new Date(),
          updatedAt: new Date(),
        });
      }
    }

    const allRedisVendorIds = redisCarts.reduce((acc: string[], cart: any) => {
      const ids = cart.items
        .map((item: any) => item.vendorId?.toString())
        .filter(Boolean);
      return [...acc, ...ids];
    }, []);
    const uniqueRedisVendorIds = [...new Set(allRedisVendorIds)];

    if (uniqueRedisVendorIds.length > 0) {
      const vendors = await Vendor.find({ _id: { $in: uniqueRedisVendorIds } })
        .select(
          'rating businessDetails.businessName businessDetails.businessType documents.storePhoto',
        )
        .lean();

      const businessTypeIds = [
        ...new Set(
          vendors
            .map((v: any) => v.businessDetails?.businessType?.toString())
            .filter(Boolean),
        ),
      ];

      let businessTypeMap = new Map();
      if (businessTypeIds.length > 0) {
        const businessTypes = await BusinessCategory.find({
          _id: { $in: businessTypeIds },
        })
          .select('name')
          .lean();
        businessTypeMap = new Map(
          businessTypes.map((b) => [b._id.toString(), b]),
        );
      }

      const vendorMap = new Map(
        vendors.map((vendor: any) => {
          const bTypeId = vendor.businessDetails?.businessType?.toString();
          let formattedBusinessTypeName = '';

          if (bTypeId && businessTypeMap.has(bTypeId)) {
            const bTypeData = businessTypeMap.get(bTypeId);
            formattedBusinessTypeName =
              bTypeData.name?.[lang] || bTypeData.name?.['en'] || '';
          }

          return [
            vendor._id.toString(),
            {
              ...vendor,
              businessDetails: {
                ...vendor.businessDetails,
                businessType: formattedBusinessTypeName,
              },
            },
          ];
        }),
      );

      redisCarts = redisCarts.map((cart) => {
        cart.items = cart.items.map((item: any) => {
          if (item.vendorId) {
            const fullVendorInfo = vendorMap.get(item.vendorId.toString());
            return { ...item, vendorId: fullVendorInfo || item.vendorId };
          }
          return item;
        });
        return cart;
      });
    }
  }

  const cartQuery = new QueryBuilder(Cart.find({ isDeleted: false }), query)
    .search([])
    .filter()
    .sort()
    .paginate()
    .fields();

  const populateOptions = getPopulateOptions(currentUser.role, {
    customer: 'name',
  });
  populateOptions.forEach((option) => {
    cartQuery.modelQuery = cartQuery.modelQuery.populate(option);
  });

  cartQuery.modelQuery = cartQuery.modelQuery.populate({
    path: 'items.vendorId',
    select:
      'rating businessDetails.businessName businessDetails.businessType documents.storePhoto',
    populate: {
      path: 'businessDetails.businessType',
      model: 'BusinessCategory',
      select: 'name',
    },
  });

  const dbCarts = await cartQuery.modelQuery;

  const formattedDbCarts = dbCarts.map((dbCart: any) => {
    const cartObj = dbCart.toObject ? dbCart.toObject() : dbCart;

    if (cartObj.cartCalculation) {
      delete cartObj.cartCalculation.taxableAmount;
      delete cartObj.cartCalculation.subtotal;
    }

    if (cartObj.items && cartObj.items.length > 0) {
      cartObj.items = cartObj.items.map((item: any) => {
        if (item.vendorId && typeof item.vendorId === 'object') {
          const vendor = item.vendorId;
          const bTypeData = vendor.businessDetails?.businessType;

          let formattedBusinessTypeName = '';
          if (bTypeData && typeof bTypeData === 'object') {
            formattedBusinessTypeName =
              bTypeData.name?.[lang] || bTypeData.name?.['en'] || '';
          }

          item.vendorId = {
            ...vendor,
            businessDetails: {
              ...vendor.businessDetails,
              businessType: formattedBusinessTypeName,
            },
          };
        }
        return item;
      });
    }

    return {
      ...cartObj,
      status: cartObj.status || 'abandoned',
    };
  });

  const combinedData = [...redisCarts];

  formattedDbCarts.forEach((dbCart) => {
    const dbCustId =
      dbCart.customerId?._id?.toString() || dbCart.customerId?.toString();
    const isAlreadyInRedis = redisCarts.some((rc) => {
      const redisCustId =
        rc.customerId?._id?.toString() || rc.customerId?.toString();
      return redisCustId === dbCustId;
    });

    if (!isAlreadyInRedis) {
      combinedData.push(dbCart);
    }
  });

  const totalItemsCount = combinedData.length;
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 10;

  const startIndex = (page - 1) * limit;
  const paginatedData = combinedData.slice(startIndex, startIndex + limit);

  const meta = {
    page,
    limit,
    total: totalItemsCount,
    totalPage: Math.ceil(totalItemsCount / limit),
  };

  return {
    messageKey: 'DATA_LOAD_SUCCESS',
    variables: { entity: 'Carts', isPlural: true },
    meta,
    data: paginatedData,
  };
};

// view cart Service
const viewCart = async (
  currentUser: TCurrentUser,
  query: Record<string, unknown>,
  lang: TLanguageCode = 'en',
) => {
  if (currentUser.status !== 'APPROVED') {
    throw new AppError(httpStatus.FORBIDDEN, 'CART_VIEW_RESTRICTED', {
      status: currentUser.status,
    });
  }

  const customerId =
    typeof query.customerId === 'string' ? query.customerId : undefined;
  const vendorId =
    typeof query.vendorId === 'string' ? query.vendorId : undefined;

  if (currentUser.role !== 'CUSTOMER' && !customerId) {
    throw new AppError(httpStatus.BAD_REQUEST, 'CUSTOMER_ID_REQUIRED');
  }

  const targetCustomerId =
    currentUser.role === 'CUSTOMER' ? currentUser._id : customerId!;

  const customerIdStr = targetCustomerId.toString();
  const dataKey = `cart:data:${customerIdStr}`;

  let cart = await RedisService.get<any>(dataKey);
  let isFromCache = true;

  if (!cart) {
    isFromCache = false;
    const dbCart = await Cart.findOne({
      customerId: targetCustomerId,
      isDeleted: false,
    })
      .populate({
        path: 'items.vendorId',
        select:
          'rating businessDetails.businessName businessDetails.businessType documents.storePhoto',
        populate: {
          path: 'businessDetails.businessType',
          model: 'BusinessCategory',
          select: 'name',
        },
      })
      .lean();

    if (dbCart) {
      cart = dbCart;
    }
  }

  if (!cart && currentUser.role === 'CUSTOMER') {
    return {
      messageKey: 'DATA_LOAD_SUCCESS',
      variables: { entity: 'Cart' },
      data: {
        customerId: targetCustomerId,
        items: [],
        totalItems: 0,
        totalQuantity: 0,
        cartCalculation: {
          totalOriginalPrice: 0,
          totalProductDiscount: 0,
          totalTaxAmount: 0,
          grandTotal: 0,
        },
        hasActiveItems: false,
        isDeleted: false,
      },
    };
  }

  if (!cart) {
    throw new AppError(httpStatus.NOT_FOUND, 'CART_NOT_FOUND');
  }

  if (cart.items && cart.items.length > 0) {
    let isCartDirty = false;

    for (const item of cart.items) {
      const freshProduct = await Product.findOne({
        _id: item.productId,
        isDeleted: false,
        isApproved: true,
      }).lean();

      if (!freshProduct) {
        if (item.isActive !== false) {
          item.isActive = false;
          isCartDirty = true;
        }
        continue;
      }

      let currentPrice = freshProduct.pricing.price;
      if (item.hasVariations && item.variationSku) {
        const variant = freshProduct.variations
          ?.flatMap((v: any) => v.options)
          .find((opt: any) => opt.sku === item.variationSku);
        if (variant) currentPrice = variant.price;
      }

      const currentDiscount = freshProduct.pricing.discount || 0;
      const currentDiscountType =
        freshProduct.pricing.discountType || 'PERCENTAGE';
      const currentTaxRate = freshProduct.pricing.taxRate || 0;

      if (
        item.productPricing.originalPrice !== currentPrice ||
        item.productPricing.taxRate !== currentTaxRate ||
        item.productPricing.discountType !== currentDiscountType ||
        item.productPricing.productDiscountAmount !==
          (currentDiscountType === 'FLAT'
            ? currentDiscount
            : (currentPrice * currentDiscount) / 100)
      ) {
        const unitDiscountAmount =
          currentDiscountType === 'FLAT'
            ? roundTo2(currentDiscount)
            : roundTo2((currentPrice * currentDiscount) / 100);

        const priceAfterDiscount = roundTo2(currentPrice - unitDiscountAmount);
        const productLineTotal = roundTo2(
          priceAfterDiscount * item.itemSummary.quantity,
        );
        const productTaxAmount = roundTo2(
          (productLineTotal * currentTaxRate) / (100 + currentTaxRate),
        );

        item.productPricing.originalPrice = roundTo2(currentPrice);
        item.productPricing.productDiscountAmount = unitDiscountAmount;
        item.productPricing.discountType = currentDiscountType;
        item.productPricing.unitPrice = priceAfterDiscount;
        item.productPricing.lineTotal = productLineTotal;
        item.productPricing.taxAmount = productTaxAmount;

        item.itemSummary.totalTaxAmount = productTaxAmount;
        item.itemSummary.totalProductDiscount = roundTo2(
          unitDiscountAmount * item.itemSummary.quantity,
        );
        item.itemSummary.grandTotal = productLineTotal;

        isCartDirty = true;
      }
    }

    if (isCartDirty) {
      await recalculateCartTotals(cart);
      await RedisService.set(dataKey, cart, 259200);
      await Cart.updateOne(
        { customerId: targetCustomerId },
        {
          items: cart.items,
          cartCalculation: cart.cartCalculation,
          totalItems: cart.totalItems,
          totalQuantity: cart.totalQuantity,
        },
      );
    }

    if (isFromCache) {
      const vendorIds = [
        ...new Set(cart.items.map((item: any) => item.vendorId?.toString())),
      ].filter(Boolean);

      if (vendorIds.length > 0) {
        const vendors = await Vendor.find({ _id: { $in: vendorIds } })
          .select(
            'rating businessDetails.businessName businessDetails.businessType documents.storePhoto',
          )
          .lean();

        const businessTypeIds = [
          ...new Set(
            vendors
              .map((v: any) => v.businessDetails?.businessType?.toString())
              .filter(Boolean),
          ),
        ];

        let businessTypeMap = new Map();
        if (businessTypeIds.length > 0) {
          const businessTypes = await BusinessCategory.find({
            _id: { $in: businessTypeIds },
          })
            .select('name')
            .lean();
          businessTypeMap = new Map(
            businessTypes.map((b) => [b._id.toString(), b]),
          );
        }

        const populatedVendors = vendors.map((vendor: any) => {
          const bTypeId = vendor.businessDetails?.businessType?.toString();
          let formattedBusinessTypeName = '';

          if (bTypeId && businessTypeMap.has(bTypeId)) {
            const bTypeData = businessTypeMap.get(bTypeId);
            formattedBusinessTypeName =
              bTypeData.name?.[lang] || bTypeData.name?.['en'] || '';
          }

          return {
            ...vendor,
            businessDetails: {
              ...vendor.businessDetails,
              businessType: formattedBusinessTypeName,
            },
          };
        });

        const vendorMap = new Map(
          populatedVendors.map((v) => [v._id.toString(), v]),
        );

        cart.items = cart.items.map((item: any) => {
          if (item.vendorId) {
            const fullVendorInfo = vendorMap.get(item.vendorId.toString());
            return { ...item, vendorId: fullVendorInfo || item.vendorId };
          }
          return item;
        });
      }
    } else {
      cart.items = cart.items.map((item: any) => {
        if (item.vendorId && typeof item.vendorId === 'object') {
          const vendor = item.vendorId;
          const bTypeData = vendor.businessDetails?.businessType;

          let formattedBusinessTypeName = '';
          if (bTypeData && typeof bTypeData === 'object') {
            formattedBusinessTypeName =
              bTypeData.name?.[lang] || bTypeData.name?.['en'] || '';
          }

          item.vendorId = {
            ...vendor,
            businessDetails: {
              ...vendor.businessDetails,
              businessType: formattedBusinessTypeName,
            },
          };
        }
        return item;
      });
    }
  }

  let responseCart = cart;

  if (vendorId) {
    const filteredItems = cart.items.filter((item: any) => {
      const itemVendorId =
        typeof item.vendorId === 'object'
          ? item.vendorId?._id?.toString()
          : item.vendorId?.toString();

      return itemVendorId === vendorId;
    });

    responseCart = {
      ...cart,
      items: filteredItems,
    };

    await recalculateCartTotals(responseCart);
  }

  responseCart = {
    ...responseCart,
    hasActiveItems: responseCart.items.some(
      (item: any) => item.isActive === true,
    ),
  };

  return {
    messageKey: 'DATA_LOAD_SUCCESS',
    variables: { entity: 'Cart' },
    data: responseCart,
  };
};

export const CartServices = {
  addToCart,
  toggleCartItemStatus,
  updateAddonQuantity,
  deleteCartItem,
  clearCart,
  getAllCart,
  viewCart,
};
