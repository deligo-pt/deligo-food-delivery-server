import { AuthUser } from '../../constant/user.const';
import { Product } from '../Product/product.model';
import { TCart } from './cart.interface';
import { Cart } from './cart.model';

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
      // Product exists in cart, update quantity
      cart.items[itemIndex].quantity += quantity;
      cart.totalPrice += existingProduct.finalPrice * quantity;
    } else {
      // Product does not exist in cart, add new item
      cart.items.push({ productId, quantity });
      cart.totalPrice += existingProduct.finalPrice * quantity;
    }
  }
  await cart.save();
  return cart;
};

export const CartServices = {
  addToCart,
};
