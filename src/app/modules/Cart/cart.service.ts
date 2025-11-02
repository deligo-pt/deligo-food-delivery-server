import httpStatus from 'http-status';
import { AuthUser } from '../../constant/user.const';
import AppError from '../../errors/AppError';
import { Product } from '../Product/product.model';
import { TCart } from './cart.interface';
import { Cart } from './cart.model';
import { QueryBuilder } from '../../builder/QueryBuilder';

// Add cart Service
const addToCart = async (payload: TCart, user: AuthUser) => {
  const customerId = user.id;
  payload.customerId = customerId;
  const { productId, quantity } = payload.items[0];

  const existingProduct = await Product.findOne({ productId });
  if (!existingProduct) {
    throw new Error('Product not found');
  }

  let cart = await Cart.findOne({ customerId });

  if (!cart) {
    // --------- No existing cart, create a new one and check availability before adding---------
    if (quantity > existingProduct.stock.quantity) {
      throw new AppError(httpStatus.BAD_REQUEST, 'Insufficient stock');
    }
    cart = new Cart({
      customerId,
      items: [{ productId, quantity }],
      totalPrice: existingProduct.finalPrice * quantity,
    });
  } else {
    const itemIndex = cart.items.findIndex(
      (item) => item.productId.toString() === productId
    );
    if (itemIndex > -1) {
      // ----------Product exists in cart, update quantity and check availability-------------
      const currentItem = cart.items[itemIndex];
      if (currentItem.quantity + quantity > existingProduct.stock.quantity) {
        throw new AppError(httpStatus.BAD_REQUEST, 'Insufficient stock');
      }
      cart.items[itemIndex].quantity += quantity;
      cart.totalPrice += existingProduct.finalPrice * quantity;
    } else {
      // ----------Product does not exist in cart, add new item and check availability-------------
      if (quantity > existingProduct.stock.quantity) {
        throw new AppError(httpStatus.BAD_REQUEST, 'Insufficient stock');
      }
      cart.items.push({ productId, quantity });
      cart.totalPrice += existingProduct.finalPrice * quantity;
    }
  }
  await cart.save();
  return cart;
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

  const result = await carts.modelQuery;
  return result;
};

export const CartServices = {
  addToCart,
  viewCart,
  viewAllCarts,
};
