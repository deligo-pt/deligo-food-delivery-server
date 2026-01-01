/* eslint-disable @typescript-eslint/no-explicit-any */
import httpStatus from 'http-status';
import { AuthUser } from '../../constant/user.constant';
import AppError from '../../errors/AppError';
import { Product } from '../Product/product.model';
import { TCart } from './cart.interface';
import { Cart } from './cart.model';
import { Customer } from '../Customer/customer.model';
import { getPopulateOptions } from '../../utils/getPopulateOptions';
import { recalculateCartTotals } from './cart.constant';
import { Vendor } from '../Vendor/vendor.model';

// Add cart Service
const addToCart = async (payload: TCart, currentUser: AuthUser) => {
  // Customer validation
  const existingCustomer = await Customer.isUserExistsByUserId(
    currentUser.id,
    false
  );
  if (!existingCustomer)
    throw new AppError(httpStatus.NOT_FOUND, 'Customer not found');

  const customerId = existingCustomer._id;

  // Product validation
  const { productId, quantity, variantName } = payload.items[0];
  const existingProduct = await Product.findOne({
    _id: productId,
    isDeleted: false,
    isApproved: true,
  }).populate('addonGroups');
  if (!existingProduct) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      'Product not found or unavailable'
    );
  }
  if (existingProduct && existingProduct.vendorId) {
    const existingVendor = await Vendor.findOne({
      _id: existingProduct.vendorId,
      isDeleted: false,
    });
    if (!existingVendor) {
      throw new AppError(httpStatus.NOT_FOUND, 'Vendor not found');
    }
    if (existingVendor?.businessDetails?.isStoreOpen === false) {
      throw new AppError(httpStatus.BAD_REQUEST, 'Store is closed');
    }
  }

  let itemPrice = existingProduct.pricing.finalPrice;

  if (variantName) {
    const variantOption = existingProduct.variations
      ?.flatMap((v) => v.options)
      .find((opt) => opt.label === variantName);

    if (variantOption) {
      itemPrice = variantOption.price;
    }
  }

  const itemSubtotal = itemPrice! * quantity;
  const newItem = {
    productId: existingProduct._id,
    vendorId: existingProduct.vendorId,
    name: existingProduct.name,
    image: existingProduct?.images[0] || '',
    variantName,
    quantity,
    price: itemPrice,
    subtotal: itemSubtotal,
    taxRate: existingProduct?.pricing?.taxRate || 0,
    isActive: true,
  };

  let cart = await Cart.findOne({ customerId, isDeleted: false });

  // Create cart if not exists
  if (!cart) {
    if (quantity > existingProduct.stock.quantity)
      throw new AppError(httpStatus.BAD_REQUEST, 'Insufficient product stock');

    cart = new Cart({
      customerId,
      items: [newItem],
      totalItems: quantity,
      totalPrice: newItem.subtotal,
      discount: 0,
      subtotal: newItem.subtotal,
      couponId: null,
    });

    await cart.save();
    return cart;
  }

  // Update or push item
  const activeItem = cart.items.find((i) => i.isActive === true);
  const itemIndex = cart.items.findIndex(
    (i) => i.productId.toString() === productId.toString()
  );

  if (itemIndex > -1) {
    const currentItem = cart.items[itemIndex];

    if (currentItem.quantity + quantity > existingProduct.stock.quantity)
      throw new AppError(httpStatus.BAD_REQUEST, 'Insufficient product stock');

    currentItem.quantity += quantity;
    currentItem.subtotal = currentItem.quantity * currentItem.price;
  } else {
    if (
      activeItem &&
      activeItem.vendorId.toString() !== newItem.vendorId.toString()
    ) {
      newItem.isActive = false;
    }
    cart.items.push(newItem as any);
  }

  // always re-calculate active total (real-time)
  await recalculateCartTotals(cart);
  cart.markModified('items');
  await cart.save();
  return cart;
};

// active item Service
const activateItem = async (
  currentUser: AuthUser,
  productId: string,
  variantName?: string
) => {
  const existingCustomer = await Customer.findOne({
    userId: currentUser.id,
    isDeleted: false,
  });

  if (!existingCustomer) {
    throw new AppError(httpStatus.NOT_FOUND, 'Customer not found');
  }

  const customerId = existingCustomer._id;

  const cart = await Cart.findOne({ customerId });
  if (!cart) {
    throw new AppError(httpStatus.NOT_FOUND, 'Cart not found');
  }
  // Item to activate
  const itemToActivate = cart.items.find(
    (i) =>
      i.productId.toString() === productId.toString() &&
      i.variantName === variantName
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
        'You can only select items from the same vendor'
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
  }
) => {
  const existingCustomer = await Customer.findOne({
    userId: currentUser.id,
    isDeleted: false,
  });

  if (!existingCustomer) {
    throw new AppError(httpStatus.NOT_FOUND, 'Customer not found');
  }

  const customerId = existingCustomer._id;
  const cart = await Cart.findOne({ customerId });
  if (!cart) {
    throw new AppError(httpStatus.NOT_FOUND, 'Cart not found');
  }
  const { productId, variantName, quantity, action } = payload;
  const itemIndex = cart.items.findIndex(
    (i) => i.productId.toString() === productId && i.variantName === variantName
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
    targetItem.subtotal += targetItem.price * quantity;
  } else if (action === 'decrement') {
    if (targetItem.quantity - quantity < 1) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'Not allowed to decrement quantity below 1'
      );
    }
    targetItem.quantity -= quantity;
    targetItem.subtotal -= targetItem.price * quantity;
  }

  // re-calculate active total
  await recalculateCartTotals(cart);

  cart.markModified('items');
  await cart.save();
  return cart;
};

// delete cart item
const deleteCartItem = async (currentUser: AuthUser, productId: string[]) => {
  const existingCustomer = await Customer.findOne({
    userId: currentUser.id,
    isDeleted: false,
  });

  if (!existingCustomer) {
    throw new AppError(httpStatus.NOT_FOUND, 'Customer not found');
  }

  const customerId = existingCustomer._id;
  const cart = await Cart.findOne({ customerId });
  if (!cart) {
    throw new AppError(httpStatus.NOT_FOUND, 'Cart not found');
  }
  const filteredItems = cart.items.filter(
    (item) => !productId.includes(item.productId.toString())
  );
  if (filteredItems.length === cart.items.length) {
    throw new AppError(httpStatus.NOT_FOUND, 'Product not found in cart');
  }

  cart.items = filteredItems;

  // re-calculate active total
  await recalculateCartTotals(cart);

  cart.markModified('items');
  await cart.save();
  return cart;
};

const updateCartItemAddons = async (
  currentUser: AuthUser,
  payload: {
    productId: string;
    variantName?: string;
    addons: { optionId: string; quantity: number }[];
  }
) => {
  const existingCustomer = await Customer.findOne({ userId: currentUser.id });
  if (!existingCustomer)
    throw new AppError(httpStatus.NOT_FOUND, 'Customer not found');

  const existingProduct = await Product.findOne({
    _id: payload.productId,
    isDeleted: false,
  }).populate('addonGroups');

  if (!existingProduct)
    throw new AppError(httpStatus.NOT_FOUND, 'Product not found');

  const allowedAddonsMap = new Map<string, { name: string; price: number }>();

  ((existingProduct.addonGroups as any[]) || []).forEach((group) => {
    if (group?.options) {
      group.options.forEach((opt: any) => {
        allowedAddonsMap.set(opt._id.toString(), {
          name: opt.name,
          price: opt.price,
        });
      });
    }
  });

  const cart = await Cart.findOne({ customerId: existingCustomer._id });
  if (!cart) throw new AppError(httpStatus.NOT_FOUND, 'Cart not found');

  const { productId, variantName, addons } = payload;

  const itemIndex = cart.items.findIndex(
    (i) =>
      i.productId.toString() === productId &&
      (variantName ? i.variantName === variantName : !i.variantName)
  );

  if (itemIndex === -1)
    throw new AppError(httpStatus.NOT_FOUND, 'Item not found in cart');

  const targetItem = cart.items[itemIndex];
  const currentItemAddons = [...(targetItem.addons || [])];

  for (const newAddon of addons) {
    if (!allowedAddonsMap.has(newAddon.optionId)) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        `Selected add-on is not valid for this product.`
      );
    }

    const dbAddonData = allowedAddonsMap.get(newAddon.optionId)!;

    const existingIndex = currentItemAddons.findIndex(
      (a) => a.name === dbAddonData.name
    );

    if (existingIndex > -1) {
      currentItemAddons[existingIndex].quantity += newAddon.quantity;
      currentItemAddons[existingIndex].price = dbAddonData.price;
    } else {
      currentItemAddons.push({
        name: dbAddonData.name,
        price: dbAddonData.price,
        quantity: newAddon.quantity,
      });
    }
  }

  targetItem.addons = currentItemAddons;
  const addonsTotal = currentItemAddons.reduce(
    (sum, a) => sum + a.price * a.quantity,
    0
  );

  targetItem.subtotal = targetItem.price * targetItem.quantity + addonsTotal;

  cart.items[itemIndex] = targetItem;

  await recalculateCartTotals(cart);
  cart.markModified('items');
  await cart.save();

  return cart;
};

// view cart Service
const viewCart = async (currentUser: AuthUser) => {
  const existingCustomer = await Customer.findOne({
    userId: currentUser.id,
    isDeleted: false,
  });
  const customerId = existingCustomer?._id;
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

export const CartServices = {
  addToCart,
  activateItem,
  updateCartItemQuantity,
  deleteCartItem,
  updateCartItemAddons,
  viewCart,
};
