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
import { TAuthUser } from '../AuthUser/authUser.interface';
import { AuthUser } from '../AuthUser/authUser.model';

// Add cart Service
const addToCart = async (payload: any, currentUser: TAuthUser) => {
  if (currentUser.role !== 'CUSTOMER') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'Only customers are allowed to perform this action',
    );
  }
  if (currentUser.status !== 'APPROVED') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'Your account is not approved yet.',
    );
  }

  const customerId = currentUser._id;
  const inputItem = payload.items?.[0];
  if (!inputItem)
    throw new AppError(httpStatus.BAD_REQUEST, 'No items provided');

  const { productId, variationSku } = inputItem;
  const quantity = Number(inputItem.quantity) || 1;

  const existingProduct = await Product.findOne({
    _id: productId,
    isDeleted: false,
    isApproved: true,
  });

  if (!existingProduct)
    throw new AppError(httpStatus.NOT_FOUND, 'Product not found');

  const vendorAuth = await AuthUser.findOne({
    _id: existingProduct.vendorId,
    role: 'VENDOR',
    isDeleted: false,
  }).lean();

  if (!vendorAuth) {
    throw new AppError(httpStatus.NOT_FOUND, 'Vendor account not found');
  }

  const existingVendor = await Vendor.findById(vendorAuth.userObjectId).lean();

  if (
    !existingVendor ||
    existingVendor?.businessDetails?.isStoreOpen === false
  ) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Store is closed or unavailable',
    );
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
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'This product has multiple variations. Please select a variation to proceed.',
      );
    }

    const targetOption = existingProduct.variations
      ?.flatMap((v: any) => v.options)
      .find((opt: any) => opt.sku === variationSku);

    if (!targetOption) {
      throw new AppError(httpStatus.NOT_FOUND, 'Invalid variation SKU');
    }

    selectedPrice = targetOption.price;
    selectedVariantLabel = targetOption.label;
    availableStock = targetOption.stockQuantity ?? 0;
    finalVariationSku = targetOption.sku;
  } else {
    if (variationSku) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'This product does not support variations. Please clear selection.',
      );
    }
    finalVariationSku = null;
  }

  if (!isRestaurant && quantity > availableStock)
    throw new AppError(httpStatus.BAD_REQUEST, 'Insufficient stock');

  const { discount = 0, taxRate = 0 } = existingProduct.pricing;
  const unitDiscountAmount = roundTo2((selectedPrice * discount) / 100);
  const priceAfterDiscount = roundTo2(selectedPrice - unitDiscountAmount);

  const productLineTotal = roundTo2(priceAfterDiscount * quantity);
  const productTaxAmount = roundTo2((productLineTotal * taxRate) / 100);

  const newItem: any = {
    productId: existingProduct._id,
    vendorId: existingProduct.vendorId,
    name: selectedVariantLabel
      ? `${existingProduct.name} - ${selectedVariantLabel}`
      : existingProduct.name,
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

  let cart = await Cart.findOne({ customerId, isDeleted: false });

  if (!cart) {
    cart = new Cart({ customerId, items: [newItem] });
  } else {
    const itemIndex = cart.items.findIndex(
      (i: any) =>
        i.productId.toString() === productId.toString() &&
        (i.variationSku || null) === (finalVariationSku || null),
    );

    if (itemIndex > -1) {
      const currentItem = cart.items[itemIndex];
      const finalQuantity = currentItem.itemSummary.quantity + quantity;

      if (!isRestaurant && finalQuantity > availableStock) {
        throw new AppError(
          httpStatus.BAD_REQUEST,
          `Insufficient stock. You already have ${currentItem.itemSummary.quantity} in cart.`,
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
  cart.markModified('items');
  await cart.save();
  return cart;
};

// active item Service
const activateItem = async (
  currentUser: TAuthUser,
  productId: string,
  variationSku?: string,
) => {
  if (currentUser.status !== 'APPROVED') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      `You are not approved to update cart. Your account is ${currentUser.status}`,
    );
  }

  const customerId = currentUser._id;

  const cart = await Cart.findOne({ customerId });
  if (!cart) {
    throw new AppError(httpStatus.NOT_FOUND, 'Cart not found');
  }

  const itemToActivate = cart.items.find((i: any) => {
    const isSameProduct = i.productId.toString() === productId.toString();
    const currentItemSku = i.variationSku || null;
    const inputSku = variationSku || null;

    return isSameProduct && currentItemSku === inputSku;
  });

  if (!itemToActivate) {
    throw new AppError(httpStatus.NOT_FOUND, 'Product not found in cart');
  }

  const selectedVendorId = itemToActivate.vendorId.toString();

  const activeItems = cart.items.filter((i) => i.isActive === true);

  if (activeItems.length > 0) {
    const activeVendorId = activeItems[0].vendorId.toString();

    if (!itemToActivate.isActive && activeVendorId !== selectedVendorId) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'You can only select items from the same vendor. Please unselect other vendor items first.',
      );
    }
  }

  itemToActivate.isActive = !itemToActivate.isActive;

  await recalculateCartTotals(cart);

  cart.markModified('items');
  await cart.save();

  return cart;
};

// update cart item quantity
const updateCartItemQuantity = async (
  currentUser: TAuthUser,
  payload: {
    productId: string;
    variationSku?: string;
    quantity: number;
    action: 'increment' | 'decrement';
  },
) => {
  if (currentUser.status !== 'APPROVED') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      `You are not approved to update cart. Your account is ${currentUser.status}`,
    );
  }

  const { productId, variationSku, quantity, action } = payload;
  const customerId = currentUser._id;
  const cart = await Cart.findOne({ customerId, isDeleted: false });
  if (!cart) {
    throw new AppError(httpStatus.NOT_FOUND, 'Cart not found');
  }

  const itemIndex = cart.items.findIndex((i: any) => {
    const isSameProduct = i.productId.toString() === productId.toString();
    const effectiveSku = i.hasVariations ? variationSku || null : null;
    return isSameProduct && (i.variationSku || null) === effectiveSku;
  });
  if (itemIndex === -1) {
    throw new AppError(httpStatus.NOT_FOUND, 'Product not found in cart');
  }

  const targetItem = cart.items[itemIndex];

  const product = await Product.findById(productId).lean();
  if (!product) {
    throw new AppError(httpStatus.NOT_FOUND, 'Product not found');
  }

  const vendor = await Vendor.findOne({
    _id: product.vendorId,
    isDeleted: false,
  }).lean();

  if (!vendor) {
    throw new AppError(httpStatus.NOT_FOUND, 'Vendor not found');
  }

  const isRestaurant = vendor?.businessDetails?.businessType === 'RESTAURANT';

  const shouldCheckStock = !isRestaurant;

  let availableStock = product?.stock?.quantity ?? 0;
  if (product.stock?.hasVariations && targetItem.variationSku) {
    const option = (product?.variations ?? [])
      .flatMap((v: any) => v.options)
      .find((opt: any) => opt.sku === targetItem.variationSku);
    if (option) availableStock = option.stockQuantity;
  }

  let currentQty = targetItem.itemSummary.quantity;

  if (action === 'increment') {
    if (shouldCheckStock && currentQty + quantity > availableStock) {
      throw new AppError(httpStatus.BAD_REQUEST, 'Insufficient product stock');
    }
    currentQty += quantity;
  } else if (action === 'decrement') {
    if (currentQty - quantity < 1) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'Not allowed to decrement quantity below 1',
      );
    }
    currentQty -= quantity;
  }

  targetItem.itemSummary.quantity = currentQty;

  let totalAddonsPrice = 0;
  let totalAddonsTax = 0;

  if (targetItem.addons && targetItem.addons.length > 0) {
    targetItem.addons.forEach((addon: any) => {
      const price = Number(addon.unitPrice) || Number(addon.price) || 0;
      const qty = Number(addon.quantity) || 0;

      const addonSubtotal = roundTo2(price * qty);
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
  // re-calculate active total
  await recalculateCartTotals(cart);

  cart.markModified('items');
  await cart.save();
  return cart;
};

// update add on quantity Service
const updateAddonQuantity = async (
  currentUser: TAuthUser,
  payload: {
    productId: string;
    variationSku?: string;
    optionId: string;
    action: 'increment' | 'decrement';
  },
) => {
  if (currentUser.status !== 'APPROVED') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      `You are not approved to update cart. Your account is ${currentUser.status}`,
    );
  }

  const { productId, variationSku, optionId, action } = payload;
  const cart = await Cart.findOne({
    customerId: currentUser._id,
    isDeleted: false,
  });
  if (!cart) throw new AppError(httpStatus.NOT_FOUND, 'Cart not found');

  const itemIndex = cart.items.findIndex((i: any) => {
    const isSameProduct = i.productId.toString() === productId.toString();
    const effectiveSku = i.hasVariations ? variationSku || null : null;
    return isSameProduct && (i.variationSku || null) === effectiveSku;
  });

  if (itemIndex === -1)
    throw new AppError(httpStatus.NOT_FOUND, 'Item not found in cart');

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

  if (!product) throw new AppError(httpStatus.NOT_FOUND, 'Product not found');

  let addonData: any = null;

  let parentGroup: any = null;

  ((product.addonGroups as any[]) || []).forEach((group) => {
    if (group.isActive && !group.isDeleted) {
      const option = group.options.find(
        (opt: any) => opt._id.toString() === optionId,
      );
      if (option && option.isActive) {
        addonData = {
          optionId: option._id.toString(),
          name: option.name,
          sku: option.sku,
          unitPrice: option.price,
          taxRate: option.tax?.taxRate || 0,
        };
        parentGroup = group;
      }
    }
  });

  if (!addonData)
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Addon is inactive or unavailable',
    );

  const selectedAddon = addonData as {
    optionId: string;
    name: string;
    sku?: string;
    price: number;
    taxRate: number;
  };

  const existingAddonIndex = targetItem.addons.findIndex(
    (a: any) => a.optionId?.toString() === selectedAddon.optionId.toString(),
  );

  if (action === 'increment') {
    const groupOptionIds = parentGroup.options.map((o: any) =>
      o._id.toString(),
    );
    const currentGroupSelectionCount = targetItem.addons
      .filter((a: any) => groupOptionIds.includes(a.optionId.toString()))
      .reduce((sum: number, a: any) => sum + a.quantity, 0);

    if (currentGroupSelectionCount >= parentGroup.maxSelectable) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        `Maximum selection limit of ${parentGroup.maxSelectable} reached for ${parentGroup.title}`,
      );
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
      throw new AppError(httpStatus.NOT_FOUND, 'Addon not found in your cart');
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
  cart.markModified('items');
  await cart.save();

  return cart;
};

// delete cart item
const deleteCartItem = async (
  currentUser: TAuthUser,
  itemsToDelete: { productId: string; variationSku?: string }[],
) => {
  if (currentUser.status !== 'APPROVED') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      `You are not approved to update cart. Your account is ${currentUser.status}`,
    );
  }

  const cart = await Cart.findOne({
    customerId: currentUser._id,
    isDeleted: false,
  });
  if (!cart || !cart.items || cart.items.length === 0) {
    throw new AppError(httpStatus.NOT_FOUND, 'Cart is empty or not found');
  }

  const initialLength = cart.items.length;

  cart.items = cart.items.filter((cartItem: any) => {
    const isTargetedForDeletion = itemsToDelete.some((target) => {
      const isSameProduct = target.productId === cartItem.productId.toString();

      const effectiveSku = cartItem.hasVariations
        ? target.variationSku || null
        : null;
      const dbSku = cartItem.variationSku || null;

      return isSameProduct && dbSku === effectiveSku;
    });

    return !isTargetedForDeletion;
  });

  if (cart.items.length === initialLength) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      'Selected items were not found in your cart',
    );
  }

  await recalculateCartTotals(cart);

  cart.markModified('items');
  await cart.save();

  return cart;
};

// clear cart Service
const clearCart = async (currentUser: TAuthUser) => {
  const cart = await Cart.findOne({
    customerId: currentUser._id,
    isDeleted: false,
  });
  if (!cart) {
    throw new AppError(httpStatus.NOT_FOUND, 'Cart not found for this user');
  }
  cart.items = [];
  cart.cartCalculation = {
    totalOriginalPrice: 0,
    totalProductDiscount: 0,
    taxableAmount: 0,
    totalTaxAmount: 0,
    grandTotal: 0,
  };

  cart.totalItems = 0;

  await cart.save();

  return cart;
};

// get all cart service
const getAllCart = async (
  currentUser: TAuthUser,
  query: Record<string, unknown>,
) => {
  if (currentUser.status !== 'APPROVED') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      `You are not approved to view cart. Your account is ${currentUser.status}`,
    );
  }

  const cart = new QueryBuilder(Cart.find(), query)
    .fields()
    .filter()
    .paginate()
    .sort()
    .search([]);

  const populateOptions = getPopulateOptions(currentUser.role, {
    customer: 'name',
  });
  populateOptions.forEach((option) => {
    cart.modelQuery = cart.modelQuery.populate(option);
  });

  const meta = await cart.countTotal();
  const data = await cart.modelQuery;

  return { meta, data };
};

// view cart Service
const viewCart = async (currentUser: TAuthUser, cartCustomerId?: string) => {
  if (currentUser.status !== 'APPROVED') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      `You are not approved to view cart. Your account is ${currentUser.status}`,
    );
  }

  if (currentUser.role !== 'CUSTOMER' && !cartCustomerId) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Customer id is required');
  }

  let customerId;
  let query: any;
  if (currentUser.role === 'CUSTOMER') {
    customerId = currentUser._id;
    query = Cart.findOne({ customerId });
  } else {
    query = Cart.findOne({ customerId: cartCustomerId });
  }

  const populateOptions = getPopulateOptions(currentUser.role, {
    customer: 'name',
    itemVendor: 'name userId',
  });
  populateOptions.forEach((option) => {
    query = query.populate(option);
  });

  const cart = await query;
  if (!cart) {
    throw new AppError(httpStatus.NOT_FOUND, 'Cart not found');
  }

  return cart;
};

export const CartServices = {
  addToCart,
  activateItem,
  updateCartItemQuantity,
  updateAddonQuantity,
  deleteCartItem,
  clearCart,
  getAllCart,
  viewCart,
};
