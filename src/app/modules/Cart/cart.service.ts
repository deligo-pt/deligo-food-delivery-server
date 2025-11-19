import httpStatus from 'http-status';
import { AuthUser } from '../../constant/user.const';
import AppError from '../../errors/AppError';
import { Product } from '../Product/product.model';
import { TCart } from './cart.interface';
import { Cart } from './cart.model';
import { QueryBuilder } from '../../builder/QueryBuilder';
import { Customer } from '../Customer/customer.model';

// Add cart Service
const addToCart = async (payload: TCart, currentUser: AuthUser) => {
  const existingCustomer = await Customer.isUserExistsByUserId(
    currentUser.id,
    false
  );
  if (!existingCustomer) {
    throw new AppError(httpStatus.NOT_FOUND, 'Customer not found');
  }

  const customerId = currentUser.id;
  payload.customerId = customerId;

  const { productId, quantity } = payload.items[0];

  const existingProduct = await Product.findOne({ productId });
  if (!existingProduct) {
    throw new AppError(httpStatus.NOT_FOUND, 'Product not found');
  }

  let cart = await Cart.findOne({ customerId });

  const newItem = {
    productId,
    vendorId: existingProduct.vendor.vendorId,
    quantity,
    price: existingProduct.pricing.finalPrice,
    name: existingProduct.name,
    subtotal: existingProduct.pricing.finalPrice * quantity,
    isActive: true,
  };
  if (!cart) {
    if (quantity > existingProduct.stock.quantity) {
      throw new AppError(httpStatus.BAD_REQUEST, 'Insufficient product stock');
    }

    cart = new Cart({
      customerId,
      items: [newItem],
      totalItems: quantity,
      totalPrice: existingProduct.pricing.finalPrice * quantity,
    });

    await cart.save();
    return cart;
  }
  const activeItem = cart.items.find((i) => i.isActive === true);
  // product exists in cart
  const itemIndex = cart.items.findIndex((i) => i.productId === productId);

  if (itemIndex > -1) {
    // Product exists then Update quantity
    const currentItem = cart.items[itemIndex];

    if (currentItem.quantity + quantity > existingProduct.stock.quantity) {
      throw new AppError(httpStatus.BAD_REQUEST, 'Insufficient product stock');
    }

    currentItem.quantity += quantity;
    currentItem.subtotal += existingProduct.pricing.finalPrice * quantity;
  } else {
    if (activeItem && activeItem.vendorId !== newItem.vendorId) {
      newItem.isActive = false;
    }
    cart.items.push(newItem);
  }

  cart.markModified('items');
  await cart.save();
  return cart;
};

// active item Service
const activateItem = async (currentUser: AuthUser, productId: string) => {
  const customerId = currentUser.id;

  const cart = await Cart.findOne({ customerId });
  if (!cart) {
    throw new AppError(httpStatus.NOT_FOUND, 'Cart not found');
  }
  // Item to activate
  const itemToActivate = cart.items.find((i) => i.productId === productId);
  if (!itemToActivate) {
    throw new AppError(httpStatus.NOT_FOUND, 'Product not found in cart');
  }

  const selectedVendorId = itemToActivate.vendorId;

  // // Get existing active items
  const activeItems = cart.items.filter((i) => i.isActive === true);

  // // If already active items exist → vendor must match
  if (activeItems.length > 0) {
    const activeVendorId = activeItems[0].vendorId;

    if (activeVendorId !== selectedVendorId) {
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
  cart.markModified('items');
  await cart.save();
  const freshCart = await Cart.findOne({ customerId });

  return freshCart;
};

// view cart Service
const viewCart = async (user: AuthUser) => {
  const customerId = user.id;
  const cart = await Cart.findOne({ customerId });
  if (!cart) {
    throw new AppError(httpStatus.NOT_FOUND, 'Cart not found');
  }
  return cart;
};

// view all cart Service
const viewAllCarts = async (query: Record<string, unknown>) => {
  const carts = new QueryBuilder(Cart.find(), query)
    .filter()
    .sort()
    .fields()
    .paginate()
    .search(['customerId']);

  const meta = await carts.countTotal();
  const data = await carts.modelQuery;
  return { meta, data };
};

export const CartServices = {
  addToCart,
  activateItem,
  viewCart,
  viewAllCarts,
};
