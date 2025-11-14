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

  if (!cart) {
    // --------- No existing cart, create a new one and check availability before adding---------
    if (quantity > existingProduct.stock.quantity) {
      throw new AppError(httpStatus.BAD_REQUEST, 'Insufficient product stock');
    }
    cart = new Cart({
      customerId,
      items: [
        {
          productId,
          quantity,
          price: existingProduct.pricing.finalPrice,
          name: existingProduct.name,
          subtotal: existingProduct.pricing.finalPrice * quantity,
        },
      ],
      totalItems: quantity,
      totalPrice: existingProduct.pricing.finalPrice * quantity,
    });
  } else {
    const itemIndex = cart.items.findIndex(
      (item) => item.productId.toString() === productId
    );
    if (itemIndex > -1) {
      // ----------Product exists in cart, update quantity and check availability-------------
      const currentItem = cart.items[itemIndex];
      if (currentItem.quantity + quantity > existingProduct.stock.quantity) {
        throw new AppError(
          httpStatus.BAD_REQUEST,
          'Insufficient product stock'
        );
      }
      cart.items[itemIndex].quantity += quantity;
      cart.items[itemIndex].subtotal +=
        existingProduct?.pricing.finalPrice * quantity;
    } else {
      // ----------Product does not exist in cart, add new item and check availability-------------
      if (quantity > existingProduct.stock.quantity) {
        throw new AppError(
          httpStatus.BAD_REQUEST,
          'Insufficient product stock'
        );
      }
      cart.items.push({
        productId,
        quantity,
        price: existingProduct?.pricing.finalPrice,
        name: existingProduct?.name,
        subtotal: existingProduct?.pricing.finalPrice * quantity,
      });
    }
  }
  cart.markModified('items');
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

  const meta = await carts.countTotal();
  const data = await carts.modelQuery;
  return { meta, data };
};

export const CartServices = {
  addToCart,
  viewCart,
  viewAllCarts,
};
