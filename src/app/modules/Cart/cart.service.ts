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

  const { productId, quantity, variantName } = payload.items[0];
  const existingProduct = await Product.findOne({
    _id: productId,
    isDeleted: false,
    isApproved: true,
  }).populate('addonGroups');

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

  if (quantity > existingProduct.stock.quantity) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Product is out of stock');
  }

  const discountPercent = existingProduct.pricing?.discount || 0;
  const taxRate = existingProduct.pricing?.taxRate || 0;

  let rawPrice = existingProduct.pricing.price;

  const hasVariations =
    existingProduct.variations && existingProduct.variations.length > 0;
  if (hasVariations && !variantName) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Please select a variation for this product',
    );
  }

  if (variantName) {
    const variantOption = existingProduct.variations
      ?.flatMap((v) => v.options)
      .find((opt) => opt.label === variantName);

    if (!variantOption)
      throw new AppError(
        httpStatus.BAD_REQUEST,
        `Variant '${variantName}' not found`,
      );

    rawPrice = variantOption.price;
  }
  const discountAmtPerUnit = parseFloat(
    ((rawPrice * discountPercent) / 100).toFixed(2),
  );

  const finalPricePerUnit = parseFloat(
    (rawPrice - discountAmtPerUnit).toFixed(2),
  );

  const totalBeforeTax = parseFloat((finalPricePerUnit * quantity).toFixed(2));
  const itemTaxAmount = parseFloat(
    (totalBeforeTax * (taxRate / 100)).toFixed(2),
  );
  const itemSubtotalWithTax = parseFloat(
    (totalBeforeTax + itemTaxAmount).toFixed(2),
  );

  const newItem = {
    productId: existingProduct._id,
    vendorId: existingProduct.vendorId,
    name: variantName
      ? existingProduct.name + ' - ' + variantName
      : existingProduct.name,
    image: existingProduct?.images[0] || '',
    variantName: variantName || null,
    quantity,
    originalPrice: rawPrice,
    discountAmount: discountAmtPerUnit,
    price: finalPricePerUnit,
    taxRate: taxRate,
    taxAmount: itemTaxAmount,
    totalBeforeTax: totalBeforeTax,
    subtotal: itemSubtotalWithTax,
    isActive: true,
    addons: [],
  };

  let cart = await Cart.findOne({ customerId, isDeleted: false });

  if (!cart) {
    if (quantity > existingProduct.stock.quantity)
      throw new AppError(httpStatus.BAD_REQUEST, 'Insufficient product stock');

    cart = new Cart({
      customerId,
      items: [newItem],
    });
  } else {
    const activeItem = cart.items.find((i) => i.isActive === true);
    const itemIndex = cart.items.findIndex(
      (i) =>
        i.productId.toString() === productId.toString() &&
        (i.variantName || null) === (variantName || null),
    );

    if (itemIndex > -1) {
      const currentItem = cart.items[itemIndex];
      const newQuantity = currentItem.quantity + quantity;

      if (newQuantity > existingProduct.stock.quantity)
        throw new AppError(
          httpStatus.BAD_REQUEST,
          'Insufficient product stock',
        );

      currentItem.quantity = newQuantity;
      currentItem.totalBeforeTax = parseFloat(
        (currentItem.price * currentItem.quantity).toFixed(2),
      );
      currentItem.taxAmount = parseFloat(
        (currentItem.totalBeforeTax * (taxRate / 100)).toFixed(2),
      );
      currentItem.subtotal = parseFloat(
        (currentItem.totalBeforeTax + currentItem.taxAmount).toFixed(2),
      );
    } else {
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
  variantName?: string,
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
  // Item to activate
  const itemToActivate = cart.items.find(
    (i) =>
      i.productId.toString() === productId.toString() &&
      i.variantName === variantName,
  );
  if (!itemToActivate) {
    throw new AppError(httpStatus.NOT_FOUND, 'Product not found in cart');
  }

  const selectedVendorId = itemToActivate.vendorId.toString();

  // // Get existing active items
  const activeItems = cart.items.filter((i) => i.isActive === true);

  // // If already active items exist → vendor must match
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
    variantName?: string;
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

  const customerId = currentUser._id;
  const cart = await Cart.findOne({ customerId });
  if (!cart) {
    throw new AppError(httpStatus.NOT_FOUND, 'Cart not found');
  }
  const { productId, variantName, quantity, action } = payload;
  const itemIndex = cart.items.findIndex(
    (i) =>
      i.productId.toString() === productId && i.variantName === variantName,
  );
  if (itemIndex === -1) {
    throw new AppError(httpStatus.NOT_FOUND, 'Product not found in cart');
  }
  const product = await Product.findById(productId);
  if (!product) {
    throw new AppError(httpStatus.NOT_FOUND, 'Product not found');
  }
  const targetItem = cart.items[itemIndex];
  if (action === 'increment') {
    if (targetItem.quantity + quantity > product.stock.quantity) {
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

  const addonsTotal = (targetItem.addons || []).reduce(
    (sum, a) => sum + a.price * a.quantity,
    0,
  );

  targetItem.totalBeforeTax = parseFloat(
    (targetItem.price * targetItem.quantity + addonsTotal).toFixed(2),
  );

  const taxRate = targetItem.taxRate || 0;
  targetItem.taxAmount = parseFloat(
    (targetItem.totalBeforeTax * (taxRate / 100)).toFixed(2),
  );

  targetItem.subtotal = parseFloat(
    (targetItem.totalBeforeTax + targetItem.taxAmount).toFixed(2),
  );

  // re-calculate active total
  await recalculateCartTotals(cart);

  cart.markModified('items');
  await cart.save();
  return cart;
};

// delete cart item
const deleteCartItem = async (
  currentUser: AuthUser,
  itemsToDelete: { productId: string; variantName?: string }[],
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

  cart.items = cart.items.filter((cartItem) => {
    const isMatched = itemsToDelete.some(
      (deleteTarget) =>
        deleteTarget.productId === cartItem.productId.toString() &&
        (deleteTarget.variantName || null) === (cartItem.variantName || null),
    );

    return !isMatched;
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
// update add on quantity Service
const updateAddonQuantity = async (
  currentUser: AuthUser,
  payload: {
    productId: string;
    variantName?: string;
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
  const cart = await Cart.findOne({ customerId: currentUser._id });
  if (!cart) throw new AppError(httpStatus.NOT_FOUND, 'Cart not found');

  const { productId, variantName, optionId, action } = payload;

  const itemIndex = cart.items.findIndex(
    (i) =>
      i.productId.toString() === productId && i.variantName === variantName,
  );
  if (itemIndex === -1)
    throw new AppError(httpStatus.NOT_FOUND, 'Item not found in cart');

  const targetItem = cart.items[itemIndex] as any;
  if (!targetItem.addons) {
    targetItem.addons = [] as any[];
  }

  const product = await Product.findById(productId).populate('addonGroups');
  if (!product) throw new AppError(httpStatus.NOT_FOUND, 'Product not found');

  let addonData: { name: string; price: number } | null = null;
  ((product.addonGroups as any[]) || []).forEach((group) => {
    group.options.forEach((opt: any) => {
      if (opt._id.toString() === optionId) {
        addonData = { name: opt.name, price: opt.price };
      }
    });
  });

  if (!addonData)
    throw new AppError(httpStatus.BAD_REQUEST, 'Invalid Addon selected');
  const { name: selectedAddonName, price: selectedAddonPrice } = addonData;

  const existingAddonIndex = targetItem.addons.findIndex(
    (a: any) => a.name === selectedAddonName,
  );

  if (action === 'increment') {
    if (existingAddonIndex > -1) {
      targetItem.addons[existingAddonIndex as number].quantity += 1;
    } else {
      targetItem.addons.push({
        name: selectedAddonName,
        price: selectedAddonPrice,
        quantity: 1,
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

  const addonsTotal = targetItem.addons.reduce(
    (sum: number, a: any) => sum + a.price * a.quantity,
    0,
  );

  targetItem.totalBeforeTax = parseFloat(
    (targetItem.price * targetItem.quantity + (addonsTotal || 0)).toFixed(2),
  );

  const taxRate = targetItem.taxRate || 0;
  targetItem.taxAmount = parseFloat(
    (targetItem.totalBeforeTax * (taxRate / 100)).toFixed(2),
  );
  targetItem.subtotal = parseFloat(
    (targetItem.totalBeforeTax + targetItem.taxAmount).toFixed(2),
  );

  await recalculateCartTotals(cart);
  cart.markModified('items');
  await cart.save();

  return cart;
};

// view cart Service
const viewCart = async (currentUser: AuthUser) => {
  if (currentUser.status !== 'APPROVED') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      `You are not approved to view cart. Your account is ${currentUser.status}`,
    );
  }
  const customerId = currentUser._id;
  const query = Cart.findOne({ customerId });

  const populateOptions = getPopulateOptions('CUSTOMER', {
    // customer: 'name',
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

// clear cart Service
const clearCart = async (currentUser: AuthUser) => {
  const cart = await Cart.findOneAndUpdate(
    { customerId: currentUser._id },
    {
      $set: {
        items: [],
        totalPrice: 0,
        taxAmount: 0,
        subtotal: 0,
        discount: 0,
      },
    },
    { new: true },
  );
  return cart;
};

export const CartServices = {
  addToCart,
  activateItem,
  updateCartItemQuantity,
  deleteCartItem,
  updateAddonQuantity,
  viewCart,
  clearCart,
};
