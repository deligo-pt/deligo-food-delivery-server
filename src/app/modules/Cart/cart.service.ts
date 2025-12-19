import httpStatus from 'http-status';
import { AuthUser } from '../../constant/user.constant';
import AppError from '../../errors/AppError';
import { Product } from '../Product/product.model';
import { TCart } from './cart.interface';
import { Cart } from './cart.model';
import { Customer } from '../Customer/customer.model';
import { getPopulateOptions } from '../../utils/getPopulateOptions';
import { recalculateCartTotals } from './cart.constant';

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
  const { productId, quantity } = payload.items[0];
  const existingProduct = await Product.findOne({ _id: productId });
  if (!existingProduct)
    throw new AppError(httpStatus.NOT_FOUND, 'Product not found');

  const newItem = {
    productId,
    vendorId: existingProduct.vendorId,
    price: existingProduct.pricing.finalPrice,
    quantity,
    subtotal: existingProduct.pricing.finalPrice * quantity,
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
    cart.items.push(newItem);
  }

  // always re-calculate active total (real-time)
  await recalculateCartTotals(cart);
  cart.markModified('items');
  await cart.save();
  return cart;
};

// active item Service
const activateItem = async (currentUser: AuthUser, productId: string) => {
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
    (i) => i.productId.toString() === productId.toString()
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
  const { productId, quantity, action } = payload;
  const itemIndex = cart.items.findIndex(
    (i) => i.productId.toString() === productId
  );
  if (itemIndex === -1) {
    throw new AppError(httpStatus.NOT_FOUND, 'Product not found in cart');
  }
  const product = await Product.findById(productId);
  if (!product) {
    throw new AppError(httpStatus.NOT_FOUND, 'Product not found');
  }
  if (action === 'increment') {
    if (cart.items[itemIndex].quantity + quantity > product.stock.quantity) {
      throw new AppError(httpStatus.BAD_REQUEST, 'Insufficient product stock');
    }
    cart.items[itemIndex].quantity += quantity;
    cart.items[itemIndex].subtotal += cart.items[itemIndex].price * quantity;
  } else if (action === 'decrement') {
    if (cart.items[itemIndex].quantity - quantity < 1) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'Not allowed to decrement quantity below 1'
      );
    }
    cart.items[itemIndex].quantity -= quantity;
    cart.items[itemIndex].subtotal -= cart.items[itemIndex].price * quantity;
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
  viewCart,
};
