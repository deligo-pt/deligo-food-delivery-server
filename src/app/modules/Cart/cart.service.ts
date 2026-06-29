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

// Add cart Service
const addToCart = async (
  payload: TCartItemInput,
  currentUser: TCurrentUser,
  lang: TLanguageCode,
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
  const quantity = Number(inputItem.quantity) || 1;

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
  });
  if (
    !existingVendor ||
    existingVendor?.businessDetails?.isStoreOpen === false
  ) {
    throw new AppError(httpStatus.BAD_REQUEST, 'STORE_CLOSED_OR_UNAPPROVED');
  }

  const isRestaurant =
    existingVendor?.businessDetails?.businessType === 'RESTAURANT';

  let selectedPrice = existingProduct.pricing.price;
  let selectedVariantLabel = '';
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

  if (!isRestaurant && quantity > availableStock)
    throw new AppError(httpStatus.BAD_REQUEST, 'INSUFFICIENT_STOCK');

  const { discount = 0, taxRate = 0 } = existingProduct.pricing;
  const unitDiscountAmount = roundTo2((selectedPrice * discount) / 100);
  const priceAfterDiscount = roundTo2(selectedPrice - unitDiscountAmount);

  const productLineTotal = roundTo2(priceAfterDiscount * quantity);
  const productTaxAmount = roundTo2((productLineTotal * taxRate) / 100);

  const pName = existingProduct.name?.[lang] || existingProduct.name?.en || '';

  let finalItemName = pName;
  if (selectedVariantLabel) {
    const vLabel =
      typeof selectedVariantLabel === 'object'
        ? selectedVariantLabel[lang] || selectedVariantLabel['en'] || ''
        : selectedVariantLabel;

    if (vLabel) {
      finalItemName = `${pName} - ${vLabel}`;
    }
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
      priceAfterProductDiscount: priceAfterDiscount,
      promoDiscountAmount: 0,
      unitPrice: priceAfterDiscount,
      lineTotal: productLineTotal,
      taxRate,
      taxAmount: productTaxAmount,
    },
    itemSummary: {
      quantity,
      totalBeforeTax: productLineTotal,
      totalTaxAmount: productTaxAmount,
      totalPromoDiscount: 0,
      totalProductDiscount: roundTo2(unitDiscountAmount * quantity),
      grandTotal: roundTo2(productLineTotal + productTaxAmount),
    },
  };

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

  if (!cart) {
    cart = {
      customerId: customerId,
      items: [newItem],
      totalItems: 1,
      cartCalculation: {
        totalOriginalPrice: 0,
        totalProductDiscount: 0,
        taxableAmount: 0,
        totalTaxAmount: 0,
        grandTotal: 0,
      },
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
      const finalQuantity = currentItem.itemSummary.quantity + quantity;

      if (!isRestaurant && finalQuantity > availableStock) {
        throw new AppError(
          httpStatus.BAD_REQUEST,
          'INSUFFICIENT_STOCK_WITH_QUANTITY',
          {
            quantity: currentItem.itemSummary.quantity,
          },
        );
      }

      const newProductLineTotal = roundTo2(priceAfterDiscount * finalQuantity);
      const newProductTax = roundTo2(newProductLineTotal * (taxRate / 100));

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

      currentItem.itemSummary.quantity = finalQuantity;
      currentItem.productPricing.lineTotal = newProductLineTotal;
      currentItem.productPricing.taxAmount = newProductTax;
      currentItem.itemSummary.totalProductDiscount = roundTo2(
        unitDiscountAmount * finalQuantity,
      );

      currentItem.itemSummary.totalBeforeTax = roundTo2(
        newProductLineTotal + existingAddonsNet,
      );
      currentItem.itemSummary.totalTaxAmount = roundTo2(
        newProductTax + existingAddonsTax,
      );
      currentItem.itemSummary.grandTotal = roundTo2(
        currentItem.itemSummary.totalBeforeTax +
          currentItem.itemSummary.totalTaxAmount,
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

  cart.totalItems = cart.items.length;

  await RedisService.set(dataKey, cart, 259200);

  await RedisService.set(expiryKey, '', 86400);

  return { messageKey: 'ADD_TO_CART_SUCCESS' as const, data: cart };
};

// toggle cart item status service
const toggleCartItemStatus = async (
  currentUser: TCurrentUser,
  productId: string,
  lang: TLanguageCode,
  variationSku?: string,
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

  if (!cart) {
    throw new AppError(httpStatus.NOT_FOUND, 'CART_NOT_FOUND');
  }

  const itemToToggle = cart.items.find((i: any) => {
    const isSameProduct = i.productId.toString() === productId.toString();
    const currentItemSku = i.variationSku || null;
    const inputSku = variationSku || null;

    return isSameProduct && currentItemSku === inputSku;
  });

  if (!itemToToggle) {
    throw new AppError(httpStatus.NOT_FOUND, 'PRODUCT_NOT_IN_CART');
  }

  const willBeActive = !itemToToggle.isActive;

  if (willBeActive) {
    const selectedVendorId = itemToToggle.vendorId.toString();

    const product = await Product.findOne({
      _id: itemToToggle.productId,
      isDeleted: false,
      isApproved: true,
    }).lean();

    if (!product) {
      throw new AppError(httpStatus.NOT_FOUND, 'PRODUCT_UNAVAILABLE');
    }

    const pName = product.name?.[lang] || product.name?.en || '';
    let finalItemName = pName;

    const hasVariations =
      product?.stock?.hasVariations === true ||
      (product?.variations && product.variations.length > 0);

    if (itemToToggle.variationSku && hasVariations) {
      const targetOption = product.variations
        ?.flatMap((v: any) => v.options)
        .find((opt: any) => opt.sku === itemToToggle.variationSku);

      const selectedVariantLabel = targetOption?.label;
      const vLabel =
        typeof selectedVariantLabel === 'object'
          ? selectedVariantLabel[lang] || selectedVariantLabel['en'] || ''
          : selectedVariantLabel;

      if (vLabel) {
        finalItemName = `${pName} - ${vLabel}`;
      }
    }

    itemToToggle.name = finalItemName;

    const activeItems = cart.items.filter((i: any) => i.isActive === true);

    if (activeItems.length > 0) {
      const activeVendorId = activeItems[0].vendorId;

      if (activeVendorId.toString() !== selectedVendorId) {
        throw new AppError(httpStatus.BAD_REQUEST, 'MULTIPLE_VENDORS_DENIED');
      }
    }
  }

  itemToToggle.isActive = willBeActive;

  await recalculateCartTotals(cart);

  cart.totalItems = cart.items.length;

  await RedisService.set(dataKey, cart, 259200);

  await RedisService.set(expiryKey, '', 86400);

  return {
    messageKey: willBeActive
      ? ('TOGGLE_ITEM_ACTIVE_SUCCESS' as const)
      : ('TOGGLE_ITEM_DEACTIVE_SUCCESS' as const),
    data: cart,
  };
};

// update cart item quantity
const updateCartItemQuantity = async (
  currentUser: TCurrentUser,
  payload: {
    productId: string;
    variationSku?: string;
    quantity: number;
    action: 'increment' | 'decrement';
  },
  lang: TLanguageCode,
) => {
  if (currentUser.status !== 'APPROVED') {
    throw new AppError(httpStatus.FORBIDDEN, 'CART_UPDATE_RESTRICTED', {
      status: currentUser.status,
    });
  }

  const { productId, variationSku, quantity, action } = payload;
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

  if (!cart) {
    throw new AppError(httpStatus.NOT_FOUND, 'CART_NOT_FOUND');
  }

  const itemIndex = cart.items.findIndex((i: any) => {
    const isSameProduct = i.productId.toString() === productId.toString();
    const currentItemSku = i.variationSku || null;
    const inputSku = variationSku || null;
    return isSameProduct && currentItemSku === inputSku;
  });

  if (itemIndex === -1) {
    throw new AppError(httpStatus.NOT_FOUND, 'PRODUCT_NOT_IN_CART');
  }

  const targetItem = cart.items[itemIndex];

  const product = await Product.findOne({
    _id: productId,
    isDeleted: false,
    isApproved: true,
  }).lean();

  if (!product) {
    throw new AppError(httpStatus.NOT_FOUND, 'PRODUCT_UNAVAILABLE');
  }

  const vendor = await Vendor.findOne({
    _id: product.vendorId,
    isDeleted: false,
  }).lean();

  if (!vendor) {
    throw new AppError(httpStatus.NOT_FOUND, 'VENDOR_NOT_FOUND');
  }

  const isRestaurant = vendor?.businessDetails?.businessType === 'RESTAURANT';
  const shouldCheckStock = !isRestaurant;

  let availableStock = product?.stock?.quantity ?? 0;
  const hasVariations =
    product?.stock?.hasVariations === true ||
    (product?.variations && product.variations.length > 0);

  if (hasVariations && targetItem.variationSku) {
    const option = (product?.variations ?? [])
      .flatMap((v: any) => v.options)
      .find((opt: any) => opt.sku === targetItem.variationSku);
    if (option) availableStock = option.stockQuantity;
  }

  let currentQty = targetItem.itemSummary.quantity;

  if (action === 'increment') {
    if (shouldCheckStock && currentQty + quantity > availableStock) {
      throw new AppError(httpStatus.BAD_REQUEST, 'INSUFFICIENT_STOCK');
    }
    currentQty += quantity;
  } else if (action === 'decrement') {
    if (currentQty - quantity < 1) {
      throw new AppError(httpStatus.BAD_REQUEST, 'DECREMENT_UNDER_MINIMUM');
    }
    currentQty -= quantity;
  }

  const pName = product.name?.[lang] || product.name?.en || '';
  let finalItemName = pName;

  if (targetItem.variationSku && hasVariations) {
    const targetOption = product.variations
      ?.flatMap((v: any) => v.options)
      .find((opt: any) => opt.sku === targetItem.variationSku);

    const selectedVariantLabel = targetOption?.label;
    const vLabel =
      typeof selectedVariantLabel === 'object'
        ? selectedVariantLabel[lang] || selectedVariantLabel['en'] || ''
        : selectedVariantLabel;

    if (vLabel) {
      finalItemName = `${pName} - ${vLabel}`;
    }
  }

  targetItem.name = finalItemName;
  targetItem.itemSummary.quantity = currentQty;

  let totalAddonsPrice = 0;
  let totalAddonsTax = 0;

  if (targetItem.addons && targetItem.addons.length > 0) {
    targetItem.addons.forEach((addon: any) => {
      const price = Number(addon.unitPrice) || Number(addon.price) || 0;
      const singleItemAddonQty = Number(addon.quantity) || 1;

      const addonSubtotal = roundTo2(price * singleItemAddonQty * currentQty);
      const addonTaxValue = roundTo2(
        addonSubtotal * ((Number(addon.taxRate) || 0) / 100),
      );

      addon.lineTotal = addonSubtotal;
      addon.taxAmount = addonTaxValue;

      totalAddonsPrice += addonSubtotal;
      totalAddonsTax += addonTaxValue;
    });
  }

  const { unitPrice, taxRate, productDiscountAmount } =
    targetItem.productPricing;

  const mainProductLineTotal = roundTo2(unitPrice * currentQty);
  const mainProductTax = roundTo2(mainProductLineTotal * (taxRate / 100));

  targetItem.productPricing.lineTotal = mainProductLineTotal;
  targetItem.productPricing.taxAmount = mainProductTax;

  targetItem.itemSummary.totalProductDiscount = roundTo2(
    productDiscountAmount * currentQty,
  );
  targetItem.itemSummary.totalBeforeTax = roundTo2(
    mainProductLineTotal + totalAddonsPrice,
  );
  targetItem.itemSummary.totalTaxAmount = roundTo2(
    mainProductTax + totalAddonsTax,
  );
  targetItem.itemSummary.grandTotal = roundTo2(
    targetItem.itemSummary.totalBeforeTax +
      targetItem.itemSummary.totalTaxAmount,
  );

  await recalculateCartTotals(cart);

  cart.totalItems = cart.items.length;

  await RedisService.set(dataKey, cart, 259200);

  await RedisService.set(expiryKey, '', 86400);

  return {
    messageKey: 'QUANTITY_UPDATE_SUCCESS' as const,
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
    action: 'increment' | 'decrement';
  },
  lang: TLanguageCode,
) => {
  if (currentUser.status !== 'APPROVED') {
    throw new AppError(httpStatus.FORBIDDEN, 'CART_UPDATE_RESTRICTED', {
      status: currentUser.status,
    });
  }

  const { productId, variationSku, optionSku, action } = payload;
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

  let addonData: any = null;
  let parentGroup: any = null;

  ((product.addonGroups as any[]) || []).forEach((group) => {
    if (group.isActive && !group.isDeleted) {
      const option = group.options.find((opt: any) => opt.sku === optionSku);
      if (option && option.isActive) {
        const addonNameObj = option.name as Record<string, string>;
        const localizedAddonName =
          addonNameObj[lang] || addonNameObj['en'] || '';
        addonData = {
          name: localizedAddonName,
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

  const nameObject = product.name as { en: string; pt: string };
  const pName =
    nameObject[lang as keyof typeof nameObject] || nameObject.en || '';
  let finalItemName = pName;

  const hasVariations =
    product?.stock?.hasVariations === true ||
    (product?.variations && product.variations.length > 0);

  if (targetItem.variationSku && hasVariations) {
    const targetOption = product.variations
      ?.flatMap((v: any) => v.options)
      .find((opt: any) => opt.sku === targetItem.variationSku);

    const selectedVariantLabel = targetOption?.label;
    if (selectedVariantLabel) {
      const vLabel =
        typeof selectedVariantLabel === 'object'
          ? (selectedVariantLabel as Record<string, string>)[lang] ||
            (selectedVariantLabel as Record<string, string>)['en'] ||
            ''
          : selectedVariantLabel;

      if (vLabel) {
        finalItemName = `${pName} - ${vLabel}`;
      }
    }
  }

  targetItem.name = finalItemName;

  const selectedAddon = addonData as {
    name: string;
    sku?: string;
    price: number;
    taxRate: number;
  };

  const existingAddonIndex = targetItem.addons.findIndex(
    (a: any) => a.sku === selectedAddon.sku,
  );

  if (action === 'increment') {
    const groupOptionSkuS = parentGroup.options.map((o: any) => o.sku);
    const currentGroupSelectionCount = targetItem.addons
      .filter((a: any) => groupOptionSkuS.includes(a.sku))
      .reduce((sum: number, a: any) => sum + a.quantity, 0);

    if (currentGroupSelectionCount >= parentGroup.maxSelectable) {
      const groupTitleObj = parentGroup.title as Record<string, string>;
      const localizedGroupTitle =
        groupTitleObj?.[lang] || groupTitleObj?.['en'] || 'this group';
      throw new AppError(httpStatus.BAD_REQUEST, 'ADDON_LIMIT_REACHED', {
        max: parentGroup.maxSelectable,
        group: localizedGroupTitle,
      });
    }
    if (existingAddonIndex > -1) {
      targetItem.addons[existingAddonIndex].quantity += 1;
    } else {
      const taxAmount = roundTo2(
        addonData.unitPrice * (addonData.taxRate / 100),
      );
      targetItem.addons.push({
        ...addonData,
        originalPrice: addonData.unitPrice,
        quantity: 1,
        lineTotal: addonData.unitPrice,
        taxAmount: taxAmount,
      });
    }
  } else if (action === 'decrement') {
    if (existingAddonIndex === -1) {
      throw new AppError(httpStatus.NOT_FOUND, 'ADDON_NOT_IN_CART');
    }

    if (targetItem.addons[existingAddonIndex].quantity > 1) {
      targetItem.addons[existingAddonIndex].quantity -= 1;
    } else {
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
    const addonTaxAmount = roundTo2(addonLineTotal * (aTaxRate / 100));

    addon.lineTotal = addonLineTotal;
    addon.taxAmount = addonTaxAmount;

    totalAddonsNet += addonLineTotal;
    totalAddonsTax += addonTaxAmount;
  });

  const mainProductNet = targetItem.productPricing.lineTotal;
  const mainProductTax = targetItem.productPricing.taxAmount;

  targetItem.itemSummary.totalBeforeTax = roundTo2(
    mainProductNet + totalAddonsNet,
  );
  targetItem.itemSummary.totalTaxAmount = roundTo2(
    mainProductTax + totalAddonsTax,
  );
  targetItem.itemSummary.grandTotal = roundTo2(
    targetItem.itemSummary.totalBeforeTax +
      targetItem.itemSummary.totalTaxAmount,
  );

  await recalculateCartTotals(cart);

  cart.totalItems = cart.items.length;

  await RedisService.set(dataKey, cart, 259200);

  await RedisService.set(expiryKey, '', 86400);

  return {
    messageKey: 'ADDON_QUANTITY_UPDATE_SUCCESS' as const,
    data: cart,
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
      messageKey: 'REMOVE_ITEMS_SUCCESS' as const,
      data: {
        customerId,
        items: [],
        totalItems: 0,
        cartCalculation: {
          totalOriginalPrice: 0,
          totalProductDiscount: 0,
          taxableAmount: 0,
          totalTaxAmount: 0,
          grandTotal: 0,
        },
        isDeleted: false,
      },
    };
  }

  await recalculateCartTotals(cart);

  cart.totalItems = cart.items.length;

  await RedisService.set(dataKey, cart, 259200);
  await RedisService.set(expiryKey, '', 86400);

  return {
    messageKey: 'REMOVE_ITEMS_SUCCESS' as const,
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
    messageKey: 'CLEAR_CART_SUCCESS' as const,
    data: {
      customerId,
      items: [],
      totalItems: 0,
      cartCalculation: {
        totalOriginalPrice: 0,
        totalProductDiscount: 0,
        taxableAmount: 0,
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
) => {
  if (currentUser.status !== 'APPROVED') {
    throw new AppError(httpStatus.FORBIDDEN, 'CART_VIEW_RESTRICTED', {
      status: currentUser.status,
    });
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

  const meta = await cartQuery.countTotal();
  const dbCarts = await cartQuery.modelQuery;

  const combinedData = await Promise.all(
    dbCarts.map(async (dbCart: any) => {
      const customerIdStr = dbCart.customerId._id
        ? dbCart.customerId._id.toString()
        : dbCart.customerId.toString();

      const dataKey = `cart:data:${customerIdStr}`;

      const redisCart = await RedisService.get<any>(dataKey);

      if (redisCart) {
        return {
          ...redisCart,
          _id: dbCart._id,
          status: 'active',
          customerId: dbCart.customerId,
          createdAt: dbCart.createdAt,
          updatedAt: new Date(),
        };
      }

      return dbCart;
    }),
  );

  return {
    messageKey: 'FETCH_ALL_SUCCESS' as const,
    meta,
    data: combinedData,
  };
};

// view cart Service
const viewCart = async (currentUser: TCurrentUser, cartCustomerId?: string) => {
  if (currentUser.status !== 'APPROVED') {
    throw new AppError(httpStatus.FORBIDDEN, 'CART_VIEW_RESTRICTED', {
      status: currentUser.status,
    });
  }

  if (currentUser.role !== 'CUSTOMER' && !cartCustomerId) {
    throw new AppError(httpStatus.BAD_REQUEST, 'CUSTOMER_ID_REQUIRED');
  }

  const targetCustomerId =
    currentUser.role === 'CUSTOMER' ? currentUser._id : cartCustomerId!;

  const customerIdStr = targetCustomerId.toString();
  const dataKey = `cart:data:${customerIdStr}`;

  let cart = await RedisService.get<any>(dataKey);

  if (!cart) {
    let dbQuery = Cart.findOne({
      customerId: targetCustomerId,
      isDeleted: false,
    });

    const populateOptions = getPopulateOptions(currentUser.role, {
      customer: 'name',
      itemVendor: 'name userId',
    });

    populateOptions.forEach((option) => {
      dbQuery = dbQuery.populate(option);
    });

    const dbCart = await dbQuery.lean();
    if (dbCart) {
      cart = dbCart;
    }
  }

  if (!cart && currentUser.role === 'CUSTOMER') {
    return {
      messageKey: 'FETCH_SINGLE_SUCCESS' as const,
      data: {
        customerId: targetCustomerId,
        items: [],
        totalItems: 0,
        cartCalculation: {
          totalOriginalPrice: 0,
          totalProductDiscount: 0,
          taxableAmount: 0,
          totalTaxAmount: 0,
          grandTotal: 0,
        },
        isDeleted: false,
      },
    };
  }

  if (!cart) {
    throw new AppError(httpStatus.NOT_FOUND, 'CART_NOT_FOUND');
  }

  return {
    messageKey: 'FETCH_SINGLE_SUCCESS' as const,
    data: cart,
  };
};

export const CartServices = {
  addToCart,
  toggleCartItemStatus,
  updateCartItemQuantity,
  updateAddonQuantity,
  deleteCartItem,
  clearCart,
  getAllCart,
  viewCart,
};
