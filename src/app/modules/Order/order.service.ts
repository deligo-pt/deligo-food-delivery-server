import httpStatus from 'http-status';
import { AuthUser } from '../../constant/user.const';
import AppError from '../../errors/AppError';
import { Cart } from '../Cart/cart.model';
import { Product } from '../Product/product.model';
import { TOrderData } from './order.interface';
import { Order } from './order.model';
import { Customer } from '../Customer/customer.model';
import { QueryBuilder } from '../../builder/QueryBuilder';
import { findUserByEmailOrId } from '../../utils/findUserByEmailOrId';

// Order Service

const createOrder = async (currentUser: AuthUser, orderData: TOrderData) => {
  const customerId = currentUser.id;

  // -------- Check if cart exists --------
  const cart = await Cart.findOne({ customerId, isDeleted: false });
  if (!cart) {
    throw new AppError(httpStatus.NOT_FOUND, 'Cart not found');
  }

  if (cart.items.length === 0) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Your cart is empty');
  }

  // -------- Match selected products with cart --------
  const selectedItems = cart.items.filter((item) =>
    orderData.items.some((orderItem) => orderItem.productId === item.productId)
  );

  if (selectedItems.length === 0) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      'No matching products found in cart'
    );
  }

  // -------- Check stock for all selected products --------
  const productIds = selectedItems.map((item) => item.productId);
  const products = await Product.find({ productId: { $in: productIds } });

  if (products.length === 0) {
    throw new AppError(httpStatus.NOT_FOUND, 'Products not found');
  }

  for (const item of selectedItems) {
    const product = products.find((p) => p.productId === item.productId);
    if (!product || product.stock.quantity < item.quantity) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        `Insufficient stock for product: ${product?.name || item.productId}`
      );
    }
  }

  // -------- Validate customer profile --------
  const customer = await Customer.findOne({
    userId: customerId,
    isDeleted: false,
  });
  if (!customer) {
    throw new AppError(httpStatus.NOT_FOUND, 'Customer not found');
  }

  if (
    !customer.name ||
    !customer.contactNumber ||
    !customer.address?.city ||
    !customer.address?.country
  ) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Please complete your profile before ordering'
    );
  }

  // -------- Determine delivery address --------
  let activeDeliveryAddress = customer.deliveryAddresses?.find(
    (addr: { address: string; isActive: boolean }) => addr.isActive
  )?.address;

  if (!activeDeliveryAddress) {
    const addr = customer.address;
    activeDeliveryAddress = `${addr?.street || ''}, ${addr?.city || ''}, ${
      addr?.state || ''
    }, ${addr?.country || ''} - ${addr?.zipCode || ''}`;
  }

  // -------- Vendor ID from first product --------
  const vendorId = products[0].vendor?.vendorId;

  // -------Generate Order ID--------
  const timestamp = Date.now().toString().slice(-6);
  const orderId = `ORD-${timestamp}`;

  // -------- Build order items --------
  const orderItems = selectedItems.map((item) => {
    const product = products.find((p) => p.productId === item.productId)!;
    return {
      productId: product.productId,
      name: product.name,
      quantity: item.quantity,
      price: product.pricing.finalPrice,
      subtotal: product.pricing.finalPrice * item.quantity,
    };
  });

  // -------- Calculate total and discount --------
  const totalPrice = orderItems.reduce((sum, item) => sum + item.subtotal, 0);
  const discount = 0; // apply coupon logic later
  const finalAmount = totalPrice - (totalPrice * discount) / 100;

  // -------- Mock payment (to integrate gateway later) --------
  const isPaymentSuccess = true;

  let order = null;
  if (isPaymentSuccess) {
    order = await Order.create({
      orderId,
      customerId,
      vendorId,
      items: orderItems,
      totalPrice,
      discount,
      finalAmount,
      paymentMethod: 'card', // set dynamically later
      paymentStatus: 'completed',
      orderStatus: 'pending',
      deliveryAddress: {
        street: customer.address?.street || '',
        city: customer.address?.city || '',
        country: customer.address?.country || '',
      },
      isPaid: true,
    });

    // -------- Reduce product stock --------
    for (const item of selectedItems) {
      const product = products.find((p) => p.productId === item.productId)!;
      product.stock.quantity -= item.quantity;
      await product.save();
    }

    // -------- Remove ordered items from cart --------
    cart.items = cart.items.filter(
      (item) =>
        !orderData.items.some((ordered) => ordered.productId === item.productId)
    );
    await cart.save();
  }

  return order;
};

//  order by vendor service
const getOrdersByVendor = async (
  vendorId: string,
  query: Record<string, unknown>
) => {
  const orders = new QueryBuilder(Order.find({ vendorId }), query)
    .filter()
    .sort()
    .fields()
    .paginate()
    .search(['orderId', 'customerId', 'vendorId']);
  const result = await orders.modelQuery;
  return result;
};

// get all order service
const getAllOrders = async (
  query: Record<string, unknown>,
  currentUser: AuthUser
) => {
  await findUserByEmailOrId({
    userId: currentUser.id,
    isDeleted: false,
  });
  const orders = new QueryBuilder(Order.find(), query)
    .filter()
    .sort()
    .fields()
    .paginate()
    .search(['orderId', 'customerId', 'vendorId']);
  const result = await orders.modelQuery;
  return result;
};

// get single order service
const getOrderById = async (
  orderId: string,
  userId: string,
  currentUser: AuthUser
) => {
  await findUserByEmailOrId({
    userId: currentUser.id,
    isDeleted: false,
  });
  const order = await Order.findOne({ orderId, customerId: userId });
  if (!order) {
    throw new AppError(httpStatus.NOT_FOUND, 'Order not found');
  }
  return order;
};

export const OrderServices = {
  createOrder,
  getOrdersByVendor,
  getAllOrders,
  getOrderById,
};
