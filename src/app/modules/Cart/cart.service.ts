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
      'Your account is not approved yet. You cannot perform this action.',
    );
  }
  const customerId = currentUser._id;

  const { productId, quantity, variationSku } = payload.items[0];
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
  let selectedVariantLabel: string | undefined = undefined;
  let finalVariationSku: string | null = null;
  let availableStock = existingProduct.stock.quantity;

  if (existingProduct.stock.hasVariations) {
    if (!variationSku) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'This product has variations. Please select one.',
      );
    }

    const variations = existingProduct.variations || [];
    let targetOption = null;

    for (const variation of variations) {
      targetOption = variation.options.find((opt) => opt.sku === variationSku);
      if (targetOption) break;
    }

    if (!targetOption) {
      throw new AppError(
        httpStatus.NOT_FOUND,
        'The selected variation SKU is invalid',
      );
    }

    selectedPrice = targetOption.price;
    selectedVariantLabel = targetOption.label;
    availableStock = targetOption.stockQuantity;
    finalVariationSku = targetOption.sku;
  } else {
    finalVariationSku = null;
  }

  if (quantity > availableStock) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Product is out of stock');
  }

  const { discount = 0, taxRate = 0 } = existingProduct.pricing;

  const priceAfterDiscount = parseFloat(
    (selectedPrice - (selectedPrice * discount) / 100).toFixed(2),
  );

  const totalBeforeTax = parseFloat((priceAfterDiscount * quantity).toFixed(2));
  const itemTaxAmount = parseFloat(
    (totalBeforeTax * (taxRate / 100)).toFixed(2),
  );
  const itemSubtotal = parseFloat((totalBeforeTax + itemTaxAmount).toFixed(2));

  const newItem = {
    productId: existingProduct._id,
    vendorId: existingProduct.vendorId,
    name: selectedVariantLabel
      ? `${existingProduct.name} - ${selectedVariantLabel}`
      : existingProduct.name,
    image: existingProduct?.images[0] || '',
    hasVariations: existingProduct.stock.hasVariations,
    variationSku: finalVariationSku,
    quantity,
    originalPrice: selectedPrice,
    discountAmount: Number((selectedPrice - priceAfterDiscount).toFixed(2)),
    price: priceAfterDiscount,

    productTotalBeforeTax: totalBeforeTax,
    productTaxAmount: itemTaxAmount,

    taxRate,
    taxAmount: itemTaxAmount,
    totalBeforeTax: totalBeforeTax,
    subtotal: itemSubtotal,
    isActive: true,
    addons: [],
  };

  let cart = await Cart.findOne({ customerId, isDeleted: false });

  if (!cart) {
    cart = new Cart({
      customerId,
      items: [newItem],
    });
  } else {
    const itemIndex = cart.items.findIndex(
      (i) =>
        i.productId.toString() === productId.toString() &&
        (i.variationSku || null) === (finalVariationSku || null),
    );

    if (itemIndex > -1) {
      const currentItem = cart.items[itemIndex];
      const finalQuantity = currentItem.quantity + quantity;

      if (finalQuantity > availableStock) {
        throw new AppError(
          httpStatus.BAD_REQUEST,
          `Insufficient stock. You already have ${currentItem.quantity} in cart.`,
        );
      }

      currentItem.quantity = finalQuantity;

      let totalAddonsPrice = 0;
      let totalAddonsTax = 0;

      if (currentItem.addons && currentItem.addons.length > 0) {
        currentItem.addons.forEach((addon: any) => {
          const addonSubtotal =
            (Number(addon.price) || 0) * (Number(addon.quantity) || 0);
          const addonTax = addonSubtotal * ((Number(addon.taxRate) || 0) / 100);

          totalAddonsPrice += addonSubtotal;
          totalAddonsTax += addonTax;

          addon.taxAmount = Number(addonTax.toFixed(2));
        });
      }

      const baseProductPrice = currentItem.price * finalQuantity;
      const baseProductTax =
        baseProductPrice * ((currentItem.taxRate || 0) / 100);

      currentItem.totalBeforeTax = Number(
        (baseProductPrice + totalAddonsPrice).toFixed(2),
      );
      currentItem.taxAmount = Number(
        (baseProductTax + totalAddonsTax).toFixed(2),
      );
      currentItem.subtotal = Number(
        (currentItem.totalBeforeTax + currentItem.taxAmount).toFixed(2),
      );
    } else {
      const activeItem = cart.items.find((i) => i.isActive === true);
      if (
        activeItem &&
        activeItem.vendorId.toString() !== existingProduct.vendorId.toString()
      ) {
        newItem.isActive = false;
      }
      cart.items.push(newItem as any);
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
  const cart = await Cart.findOne({ customerId });
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

  if (action === 'increment') {
    if (targetItem.quantity + quantity > availableStock) {
      throw new AppError(httpStatus.BAD_REQUEST, 'Insufficient product stock');
    }
    targetItem.quantity += quantity;
  } else if (action === 'decrement') {
    if (targetItem.quantity - quantity < 1) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'Not allowed to decrement quantity below 1',
      );
    }
    targetItem.quantity -= quantity;
  }

  let totalAddonsPrice = 0;
  let totalAddonsTax = 0;

  if (targetItem.addons && targetItem.addons.length > 0) {
    targetItem.addons.forEach((addon: any) => {
      const addonSubtotal =
        (Number(addon.price) || 0) * (Number(addon.quantity) || 0);
      const addonTaxValue =
        addonSubtotal * ((Number(addon.taxRate) || 0) / 100);

      totalAddonsPrice += addonSubtotal;
      totalAddonsTax += addonTaxValue;
      addon.taxAmount = Number(addonTaxValue.toFixed(2));
    });
  }

  const mainProductBasePrice = Number(
    (targetItem.price * targetItem.quantity).toFixed(2),
  );
  const mainProductTax = Number(
    (mainProductBasePrice * ((targetItem.taxRate || 0) / 100)).toFixed(2),
  );

  targetItem.productTotalBeforeTax = mainProductBasePrice;
  targetItem.productTaxAmount = mainProductTax;

  targetItem.totalBeforeTax = Number(
    (mainProductBasePrice + totalAddonsPrice).toFixed(2),
  );
  targetItem.taxAmount = Number((mainProductTax + totalAddonsTax).toFixed(2));
  targetItem.subtotal = Number(
    (targetItem.totalBeforeTax + targetItem.taxAmount).toFixed(2),
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
  const cart = await Cart.findOne({ customerId: currentUser._id });
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

  let addonData: {
    name: string;
    price: number;
    optionId: string;
    taxRate: number;
  } | null = null;

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
          price: option.price,
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
        optionId: selectedAddon.optionId,
        name: selectedAddon.name,
        price: selectedAddon.price,
        taxRate: selectedAddon.taxRate,
        quantity: 1,
        taxAmount: 0,
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

  let totalAddonsPrice = 0;
  let totalAddonsTaxAmount = 0;

  targetItem.addons.forEach((addon: any) => {
    const aPrice = Number(addon.price) || 0;
    const aQty = Number(addon.quantity) || 0;
    const aTaxRate = Number(addon.taxRate) || 0;

    const addonSubtotal = aPrice * aQty;
    const addonTaxValue = addonSubtotal * (aTaxRate / 100);

    addon.taxAmount = Number(addonTaxValue.toFixed(2));

    totalAddonsPrice += addonSubtotal;
    totalAddonsTaxAmount += addonTaxValue;
  });

  const itemsBasePrice =
    (Number(targetItem.price) || 0) * (Number(targetItem.quantity) || 0);
  const mainProductTaxRate = Number(targetItem.taxRate) || 0;
  const mainProductTaxAmount = itemsBasePrice * (mainProductTaxRate / 100);

  targetItem.productTotalBeforeTax = itemsBasePrice;
  targetItem.productTaxAmount = mainProductTaxAmount;

  targetItem.totalBeforeTax = Number(
    (itemsBasePrice + totalAddonsPrice).toFixed(2),
  );

  targetItem.taxAmount = Number(
    (mainProductTaxAmount + totalAddonsTaxAmount).toFixed(2),
  );

  targetItem.subtotal = Number(
    (targetItem.totalBeforeTax + targetItem.taxAmount).toFixed(2),
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

  const cart = await Cart.findOne({ customerId: currentUser._id });
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
  const cart = await Cart.findOneAndUpdate(
    { customerId: currentUser._id },
    {
      $set: {
        items: [],
        totalItems: 0,
        totalPrice: 0,
        taxAmount: 0,
        subtotal: 0,
        discount: 0,
        couponId: null,
      },
    },
    { new: true },
  );

  if (!cart) {
    throw new AppError(httpStatus.NOT_FOUND, 'Cart not found for this user');
  }

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
    product: 'productId name',
  });
  populateOptions.forEach((option) => {
    query.populate(option);
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
