import httpStatus from 'http-status';
import { AuthUser } from '../../constant/user.const';
import AppError from '../../errors/AppError';
import { Cart } from '../Cart/cart.model';
import { Product } from '../Product/product.model';
import { User } from '../User/user.model';
import { TOrderData } from './order.interface';
import { Order } from './order.model';

// Order Service
const createOrder = async (user: AuthUser, orderData: TOrderData) => {
  const customerId = user.id;
  // ------check this customer has this product in cart or not------
  const isInCart = await Cart.findOne({
    customerId,
  });

  if (!isInCart || isInCart.items.length === 0) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      'Product not found in cart. Please continue shopping'
    );
  }

  const selectedItems = isInCart.items.filter((item) =>
    orderData.items.some((orderItem) => orderItem.productId === item.productId)
  );

  if (selectedItems.length === 0) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      'Selected products not found in cart. Please continue shopping'
    );
  }

  // -----------check stock availability selected products of cart-------------
  const products = await Product.find({
    productId: { $in: selectedItems.map((item) => item.productId) },
  });

  if (!products || products.length === 0) {
    throw new AppError(httpStatus.NOT_FOUND, 'Products not found');
  }

  //  // Check stock for each selected item
  for (const item of selectedItems) {
    const product = products.find((p) => p.productId === item.productId);
    if (!product || product.stock.quantity < item.quantity) {
      throw new AppError(httpStatus.BAD_REQUEST, 'Product is out of stock!');
    }
  }

  // ---- check customer address,name,mobile number exist or not ----
  const customer = await User.findOne({ id: customerId });
  if (!customer) {
    throw new AppError(httpStatus.NOT_FOUND, 'Customer not found');
  }

  if (
    !customer.address?.city ||
    !customer.address?.state ||
    !customer.address?.country ||
    !customer.address?.zipCode ||
    !customer.name ||
    !customer.mobileNumber
  ) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Please provide all customer details'
    );
  }

  // ------create order-------

  let shippingAddress = customer?.deliveryAddresses
    ? customer.deliveryAddresses.find((address) => address.isActive)?.address
    : null;
  // If no active delivery address found, fallback to main address
  if (!shippingAddress) {
    shippingAddress = `${customer.address?.street}, ${customer.address?.city}, ${customer.address?.state}, ${customer.address?.country} - ${customer.address?.zipCode}`;
  }

  // ------i want to create selected items order only------
  const vendorId = products[0].vendor?.vendorId;
  const orderItems = selectedItems.map((item) => ({
    productId: item.productId,
    quantity: item.quantity,
  }));

  const totalPrice = orderItems.reduce((acc, item) => {
    const product = products.find((p) => p.productId === item.productId);
    return acc + (product ? product.finalPrice * item.quantity : 0);
  }, 0);

  // ------create order-------
  const order = await Order.create({
    customerId,
    vendorId,
    items: orderItems,
    totalPrice,
    deliveryAddress: shippingAddress,
  });

  // -----reduce stock quantity of selected products------
  for (const item of selectedItems) {
    const product = products.find((p) => p.productId === item.productId);
    if (product) {
      product.stock.quantity -= item.quantity;
      await product.save();
    }
  }

  // ------clear selected items from cart------
  isInCart.items = isInCart.items.filter(
    (item) =>
      !orderData.items.some(
        (orderItem) => orderItem.productId === item.productId
      )
  );
  await isInCart.save();

  return order;
};

export const OrderServices = {
  createOrder,
};
