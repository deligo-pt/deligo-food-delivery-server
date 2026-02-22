/* eslint-disable @typescript-eslint/no-explicit-any */
import httpStatus from 'http-status';
import { AuthUser } from '../../constant/user.constant';
import AppError from '../../errors/AppError';
import { Product } from '../Product/product.model';
import { TCart } from './cart.interface';
import { Cart } from './cart.model';
import { getPopulateOptions } from '../../utils/getPopulateOptions';
import { recalculateCartTotals } from './cart.constant';
import { Vendor } from '../Vendor/vendor.model';
import { QueryBuilder } from '../../builder/QueryBuilder';
import { roundTo4 } from '../../utils/mathProvider';

// Add cart Service
const addToCart = async (payload: TCart, currentUser: AuthUser) => {
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
  const inputItem = payload.items[0];
  if (!inputItem)
    throw new AppError(httpStatus.BAD_REQUEST, 'No items provided');

  const { productId, variationSku } = inputItem;
  const quantity = inputItem.itemSummary?.quantity || 1;

  const existingProduct = await Product.findOne({
    _id: productId,
    isDeleted: false,
    isApproved: true,
  });

  if (!existingProduct)
    throw new AppError(httpStatus.NOT_FOUND, 'Product not found');

  const existingVendor = await Vendor.findOne({
    _id: existingProduct.vendorId,
    isDeleted: false,
  });
  if (
    !existingVendor ||
    existingVendor?.businessDetails?.isStoreOpen === false
  ) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Store is closed or unavailable',
    );
  }

  let selectedPrice = existingProduct.pricing.price;
  let selectedVariantLabel = '';
  let availableStock = existingProduct.stock.quantity;
  let finalVariationSku = variationSku || null;

  if (existingProduct.stock.hasVariations) {
    if (!variationSku)
      throw new AppError(httpStatus.BAD_REQUEST, 'Please select a variation.');

    const targetOption = existingProduct.variations
      ?.flatMap((v: any) => v.options)
      .find((opt: any) => opt.sku === variationSku);

    if (!targetOption)
      throw new AppError(httpStatus.NOT_FOUND, 'Invalid variation SKU');

    selectedPrice = targetOption.price;
    selectedVariantLabel = targetOption.label;
    availableStock = targetOption.stockQuantity;
    finalVariationSku = targetOption.sku;
  } else {
    finalVariationSku = null;
  }

  if (quantity > availableStock)
    throw new AppError(httpStatus.BAD_REQUEST, 'Insufficient stock');

  const { discount = 0, taxRate = 0 } = existingProduct.pricing;
  const unitDiscountAmount = roundTo4((selectedPrice * discount) / 100);
  const priceAfterDiscount = roundTo4(selectedPrice - unitDiscountAmount);

  const productLineTotal = roundTo4(priceAfterDiscount * quantity);
  const productTaxAmount = roundTo4(productLineTotal * (taxRate / 100));

  const newItem: any = {
    productId: existingProduct._id,
    vendorId: existingProduct.vendorId,
    name: selectedVariantLabel
      ? `${existingProduct.name} - ${selectedVariantLabel}`
      : existingProduct.name,
    image: existingProduct?.images[0] || '',
    hasVariations: existingProduct.stock.hasVariations,
    variationSku: finalVariationSku,
    isActive: true,
    addons: [],
    productPricing: {
      originalPrice: roundTo4(selectedPrice),
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
      totalProductDiscount: roundTo4(unitDiscountAmount * quantity),
      grandTotal: roundTo4(productLineTotal + productTaxAmount),
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

      if (finalQuantity > availableStock) {
        throw new AppError(
          httpStatus.BAD_REQUEST,
          `Insufficient stock. You already have ${currentItem.itemSummary.quantity} in cart.`,
        );
      }

      const newProductLineTotal = roundTo4(priceAfterDiscount * finalQuantity);
      const newProductTax = roundTo4(newProductLineTotal * (taxRate / 100));

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
      currentItem.itemSummary.totalProductDiscount = roundTo4(
        unitDiscountAmount * finalQuantity,
      );

      currentItem.itemSummary.totalBeforeTax = roundTo4(
        newProductLineTotal + existingAddonsNet,
      );
      currentItem.itemSummary.totalTaxAmount = roundTo4(
        newProductTax + existingAddonsTax,
      );
      currentItem.itemSummary.grandTotal = roundTo4(
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
  currentUser: AuthUser,
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

    if (isSameProduct && !i.hasVariations) return true;

    return isSameProduct && (i.variationSku || null) === (variationSku || null);
  });
  if (!itemToActivate) {
    throw new AppError(httpStatus.NOT_FOUND, 'Product not found in cart');
  }

  const selectedVendorId = itemToActivate.vendorId.toString();

  // Get existing active items
  const activeItems = cart.items.filter((i) => i.isActive === true);

  //  If already active items exist → vendor must match
  if (activeItems.length > 0) {
    const activeVendorId = activeItems[0].vendorId;

    if (activeVendorId.toString() !== selectedVendorId) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'You can only select items from the same vendor',
      );
    }
  }

  // Activate this item
  if (itemToActivate?.isActive === false) {
    itemToActivate.isActive = true;
  } else {
    itemToActivate.isActive = false;
  }

  // re-calculate active total
  await recalculateCartTotals(cart);

  cart.markModified('items');
  await cart.save();
  const freshCart = await Cart.findOne({ customerId });

  return freshCart;
};

// update cart item quantity
const updateCartItemQuantity = async (
  currentUser: AuthUser,
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

  let availableStock = product.stock.quantity;
  if (product.stock.hasVariations && targetItem.variationSku) {
    const option = (product?.variations ?? [])
      .flatMap((v: any) => v.options)
      .find((opt: any) => opt.sku === targetItem.variationSku);
    if (option) availableStock = option.stockQuantity;
  }

  let currentQty = targetItem.itemSummary.quantity;

  if (action === 'increment') {
    if (currentQty + quantity > availableStock) {
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
      const addonSubtotal = roundTo4(price * (Number(addon.quantity) || 0));
      const addonTaxValue = roundTo4(
        addonSubtotal * ((Number(addon.taxRate) || 0) / 100),
      );

      totalAddonsPrice += addonSubtotal;
      totalAddonsTax += addonTaxValue;
      addon.lineTotal = addonSubtotal;
      addon.taxAmount = addonTaxValue;
    });
  }

  const { unitPrice, taxRate, productDiscountAmount } =
    targetItem.productPricing;

  const mainProductLineTotal = roundTo4(unitPrice * currentQty);
  const mainProductTax = roundTo4(mainProductLineTotal * (taxRate / 100));

  targetItem.productPricing.lineTotal = mainProductLineTotal;
  targetItem.productPricing.taxAmount = mainProductTax;

  targetItem.itemSummary.totalProductDiscount = roundTo4(
    productDiscountAmount * currentQty,
  );
  targetItem.itemSummary.totalBeforeTax = roundTo4(
    mainProductLineTotal + totalAddonsPrice,
  );
  targetItem.itemSummary.totalTaxAmount = roundTo4(
    mainProductTax + totalAddonsTax,
  );
  targetItem.itemSummary.grandTotal = roundTo4(
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
  currentUser: AuthUser,
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

  console.log({ itemIndex });

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
      targetItem.addons.push({
        ...addonData,
        originalPrice: addonData.unitPrice,
        quantity: 1,
        lineTotal: addonData.unitPrice,
        taxAmount: roundTo4(addonData.unitPrice * (addonData.taxRate / 100)),
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

    const addonLineTotal = roundTo4(aUnitPrice * aQty);
    const addonTaxAmount = roundTo4(addonLineTotal * (aTaxRate / 100));

    addon.lineTotal = addonLineTotal;
    addon.taxAmount = addonTaxAmount;

    totalAddonsNet += addonLineTotal;
    totalAddonsTax += addonTaxAmount;
  });

  const mainProductNet = targetItem.productPricing.lineTotal;
  const mainProductTax = targetItem.productPricing.taxAmount;

  targetItem.itemSummary.totalBeforeTax = roundTo4(
    mainProductNet + totalAddonsNet,
  );
  targetItem.itemSummary.totalTaxAmount = roundTo4(
    mainProductTax + totalAddonsTax,
  );
  targetItem.itemSummary.grandTotal = roundTo4(
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
  currentUser: AuthUser,
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
const clearCart = async (currentUser: AuthUser) => {
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
  currentUser: AuthUser,
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
const viewCart = async (currentUser: AuthUser, cartCustomerId?: string) => {
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
