import httpStatus from 'http-status';
import { AuthUser } from '../../constant/user.const';
import AppError from '../../errors/AppError';
import { Cart } from '../Cart/cart.model';
import { Product } from '../Product/product.model';
import { Order } from './order.model';
import { Customer } from '../Customer/customer.model';
import { QueryBuilder } from '../../builder/QueryBuilder';
import { findUserByEmailOrId } from '../../utils/findUserByEmailOrId';
import { OrderSearchableFields } from './order.constant';
import { Vendor } from '../Vendor/vendor.model';
import { TOrder } from './order.interface';
import { DeliveryPartner } from '../Delivery-Partner/delivery-partner.model';

// Order Service

const createOrder = async (currentUser: AuthUser, payload: TOrder) => {
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
    payload.items.some((orderItem) => orderItem.productId === item.productId)
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
      paymentMethod: 'CARD', // set dynamically later
      paymentStatus: 'COMPLETED',
      orderStatus: 'PENDING',
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
        !payload.items.some((ordered) => ordered.productId === item.productId)
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
    .search(OrderSearchableFields);
  const result = await orders.modelQuery;
  return result;
};

// get all order service
const getAllOrders = async (
  query: Record<string, unknown>,
  currentUser: AuthUser
) => {
  const existingCurrentUser = await findUserByEmailOrId({
    userId: currentUser.id,
    isDeleted: false,
  });

  const existingUser = existingCurrentUser.user;
  if (existingUser.status !== 'APPROVED') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      `You are not approved to view orders. Your account is ${existingUser.status}`
    );
  }
  if (existingCurrentUser.user.role === 'DELIVERY_PARTNER') {
    query.orderStatus = 'ACCEPTED';
  }

  const orders = new QueryBuilder(Order.find(), query)
    .filter()
    .sort()
    .fields()
    .paginate()
    .search(OrderSearchableFields);
  const result = await orders.modelQuery;
  return result;
};

// get single order for customer service
const getSingleOrder = async (orderId: string, currentUser: AuthUser) => {
  const existingCurrentUser = await findUserByEmailOrId({
    userId: currentUser.id,
    isDeleted: false,
  });
  if (existingCurrentUser.user.status !== 'APPROVED') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      `You are not approved to view the order. Your account is ${existingCurrentUser.user.status}`
    );
  }

  let order;
  const userId = currentUser.id;
  if (existingCurrentUser?.user?.role === 'CUSTOMER') {
    order = await Order.findOne({ orderId, customerId: userId });
  } else if (existingCurrentUser?.user?.role === 'VENDOR') {
    order = await Order.findOne({ orderId, vendorId: userId });
  } else {
    order = await Order.findOne({ orderId });
  }
  if (!order) {
    throw new AppError(httpStatus.NOT_FOUND, 'Order not found');
  }
  return order;
};

// accept or reject order by vendor service
const acceptOrRejectOrderByVendor = async (
  currentUser: AuthUser,
  orderId: string,
  action: { type: 'ACCEPTED' | 'REJECTED' }
) => {
  const existingVendor = await Vendor.findOne({
    userId: currentUser.id,
    isDeleted: false,
    status: 'APPROVED',
  });
  if (!existingVendor) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'You are not authorized to accept or reject orders. Please ensure your vendor profile is approved.'
    );
  }

  const order = await Order.findOne({ orderId, isDeleted: false });
  if (!order) {
    throw new AppError(httpStatus.NOT_FOUND, 'Order not found');
  }

  // only paid and pending orders can be accepted or rejected
  if (!order.isPaid) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Only paid orders can be accepted or rejected.'
    );
  }

  if (action.type === order.orderStatus) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Order is already ${action.type}.`
    );
  }
  if (order.orderStatus !== 'PENDING') {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Only pending orders can be accepted or rejected.'
    );
  }

  if (action.type === 'ACCEPTED') {
    order.pickupAddress = {
      streetAddress: existingVendor.businessLocation?.streetNumber || '',
      streetNumber: existingVendor.businessLocation?.streetNumber || '',
      city: existingVendor.businessLocation?.city || '',
      postalCode: existingVendor?.businessLocation?.postalCode || '',
      latitude: existingVendor.businessLocation?.latitude,
      longitude: existingVendor.businessLocation?.longitude,
      geoAccuracy: existingVendor.businessLocation?.geoAccuracy,
    };
    await order.save();
  }

  const result = await Order.findOneAndUpdate(
    { orderId },
    { orderStatus: action.type },
    { new: true }
  );

  return result;
};

// assigned delivery partner service
const assignDeliveryPartner = async (
  currentUser: AuthUser,
  orderId: string
) => {
  const existingDeliveryPartner = await DeliveryPartner.findOne({
    userId: currentUser.id,
    isDeleted: false,
    status: 'APPROVED',
  });
  if (!existingDeliveryPartner) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'You are not authorized to view orders. Please ensure your delivery partner profile is approved.'
    );
  }

  const order = await Order.findOne({ orderId, isDeleted: false });
  if (!order) {
    throw new AppError(httpStatus.NOT_FOUND, 'Order not found');
  }

  if (order.orderStatus === 'ASSIGNED') {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Order is already assigned to a delivery partner.'
    );
  }

  if (order.orderStatus !== 'ACCEPTED') {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Only accepted orders can be assigned to delivery partners.'
    );
  }
  const result = await Order.findOneAndUpdate(
    { orderId },
    {
      deliveryPartnerId: existingDeliveryPartner.userId,
      orderStatus: 'ASSIGNED',
    },
    { new: true }
  );
  return result;
};

export const OrderServices = {
  createOrder,
  getOrdersByVendor,
  getAllOrders,
  getSingleOrder,
  acceptOrRejectOrderByVendor,
  assignDeliveryPartner,
};
