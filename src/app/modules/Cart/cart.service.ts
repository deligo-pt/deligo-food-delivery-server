import httpStatus from 'http-status';
import { AuthUser } from '../../constant/user.constant';
import AppError from '../../errors/AppError';
import { Product } from '../Product/product.model';
import { TCart } from './cart.interface';
import { Cart } from './cart.model';
import { Customer } from '../Customer/customer.model';
import { findUserByEmailOrId } from '../../utils/findUserByEmailOrId';
import { Coupon } from '../Coupon/coupon.model';

// Add cart Service
const addToCart = async (payload: TCart, currentUser: AuthUser) => {
  // Customer validation
  const existingCustomer = await Customer.isUserExistsByUserId(
    currentUser.id,
    false
  );
  if (!existingCustomer)
    throw new AppError(httpStatus.NOT_FOUND, 'Customer not found');

  const customerId = currentUser.id;

  // Product validation
  const { productId, quantity } = payload.items[0];
  const existingProduct = await Product.findOne({ productId });

  if (!existingProduct)
    throw new AppError(httpStatus.NOT_FOUND, 'Product not found');

  const newItem = {
    productId,
    vendorId: existingProduct.vendor.vendorId,
    quantity,
    price: existingProduct.pricing.finalPrice,
    name: existingProduct.name,
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
      couponCode: '',
    });

    await cart.save();
    return cart;
  }

  // Update or push item
  const activeItem = cart.items.find((i) => i.isActive === true);
  const itemIndex = cart.items.findIndex((i) => i.productId === productId);

  if (itemIndex > -1) {
    const currentItem = cart.items[itemIndex];

    if (currentItem.quantity + quantity > existingProduct.stock.quantity)
      throw new AppError(httpStatus.BAD_REQUEST, 'Insufficient product stock');

    currentItem.quantity += quantity;
    currentItem.subtotal = currentItem.quantity * currentItem.price;
  } else {
    if (activeItem && activeItem.vendorId !== newItem.vendorId) {
      newItem.isActive = false;
    }
    cart.items.push(newItem);
  }

  // always re-calculate active total (real-time)

  const activeItems = cart.items.filter((i) => i.isActive === true);

  const activeSubtotal = activeItems.reduce((sum, i) => sum + i.subtotal, 0);

  cart.totalItems = activeItems.reduce((sum, i) => sum + i.quantity, 0);
  cart.totalPrice = parseFloat(activeSubtotal.toFixed(2));

  //  auto re-apply coupon if exists
  if (cart.couponCode && cart.couponCode.trim() !== '') {
    const couponCode = cart.couponCode.trim().toUpperCase();

    const coupon = await Coupon.findOne({
      code: couponCode,
      isActive: true,
      isDeleted: false,
    });

    // Coupon removed or invalid
    if (!coupon) {
      cart.discount = 0;
      cart.couponCode = '';
    } else {
      const now = new Date();

      // Expired coupon
      if (
        (coupon.validFrom && now < coupon.validFrom) ||
        (coupon.expiresAt && now > coupon.expiresAt)
      ) {
        cart.discount = 0;
        cart.couponCode = '';
      } else {
        // category validation
        const productIds = activeItems.map((i) => i.productId);
        const products = await Product.find({
          productId: { $in: productIds },
        }).select('productId category');

        const cartCategories = products.map((p) => p.category.toLowerCase());

        const couponCategories =
          coupon.applicableCategories?.map((c) => c.toLowerCase()) || [];

        if (
          couponCategories.length &&
          !cartCategories.some((cat) => couponCategories.includes(cat))
        ) {
          // Category mismatch → auto remove coupon
          cart.discount = 0;
          cart.couponCode = '';
        } else {
          // min purchase check (on active total)
          if (coupon.minPurchase && cart.totalPrice < coupon.minPurchase) {
            cart.discount = 0;
          } else {
            // final discount calculation
            let discount = 0;

            if (coupon.discountType === 'PERCENT') {
              discount = (cart.totalPrice * coupon.discountValue) / 100;

              if (coupon.maxDiscount)
                discount = Math.min(discount, coupon.maxDiscount);
            } else {
              discount = coupon.discountValue;
            }

            cart.discount = parseFloat(discount.toFixed(2));
            cart.couponCode = couponCode;
          }
        }
      }
    }
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

// update cart item quantity
const updateCartItemQuantity = async (
  currentUser: AuthUser,
  payload: {
    productId: string;
    quantity: number;
    action: 'increment' | 'decrement';
  }
) => {
  await findUserByEmailOrId({ userId: currentUser.id, isDeleted: false });
  const customerId = currentUser.id;
  const cart = await Cart.findOne({ customerId });
  if (!cart) {
    throw new AppError(httpStatus.NOT_FOUND, 'Cart not found');
  }
  const { productId, quantity, action } = payload;
  const itemIndex = cart.items.findIndex((i) => i.productId === productId);
  if (itemIndex === -1) {
    throw new AppError(httpStatus.NOT_FOUND, 'Product not found in cart');
  }
  const product = await Product.findOne({ productId });
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
  await cart.save();
  return cart;
};

// delete cart item
const deleteCartItem = async (currentUser: AuthUser, productId: string[]) => {
  await findUserByEmailOrId({ userId: currentUser.id, isDeleted: false });
  const customerId = currentUser.id;
  const cart = await Cart.findOne({ customerId });
  if (!cart) {
    throw new AppError(httpStatus.NOT_FOUND, 'Cart not found');
  }
  const filteredItems = cart.items.filter(
    (item) => !productId.includes(item.productId)
  );
  if (filteredItems.length === cart.items.length) {
    throw new AppError(httpStatus.NOT_FOUND, 'Product not found in cart');
  }

  cart.items = filteredItems;
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

export const CartServices = {
  addToCart,
  activateItem,
  updateCartItemQuantity,
  deleteCartItem,
  viewCart,
};
