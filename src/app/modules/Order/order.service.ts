import httpStatus from 'http-status';
import { AuthUser } from '../../constant/user.const';
import AppError from '../../errors/AppError';
import { Cart } from '../Cart/cart.model';
import { Product } from '../Product/product.model';
import { Order } from './order.model';
import { Customer } from '../Customer/customer.model';
import { QueryBuilder } from '../../builder/QueryBuilder';
import { findUserByEmailOrId } from '../../utils/findUserByEmailOrId';
import { ORDER_STATUS, OrderSearchableFields } from './order.constant';
import { Vendor } from '../Vendor/vendor.model';
import { TOrder } from './order.interface';
import { DeliveryPartner } from '../Delivery-Partner/delivery-partner.model';

// Checkout Service
const checkout = async (currentUser: AuthUser, payload: Partial<TOrder>) => {
  const customerId = currentUser.id;

  // ---------- Find Customer ----------
  const customer = await Customer.findOne({
    userId: customerId,
    isDeleted: false,
  });
  if (!customer) {
    throw new AppError(httpStatus.NOT_FOUND, 'Customer not found');
  }

  // Validate address
  if (
    !customer.name?.firstName ||
    !customer.name?.lastName ||
    !customer.contactNumber ||
    !customer.address?.state ||
    !customer.address?.city ||
    !customer.address?.country ||
    !customer.address?.zipCode
  )
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Please complete your profile before checking out'
    );

  // ---------- Get items ----------
  let selectedItems = [];

  if (payload.useCart === true) {
    // ====== Checkout using CART ======
    const cart = await Cart.findOne({ customerId, isDeleted: false });

    if (!cart || cart.items.length === 0) {
      throw new AppError(httpStatus.BAD_REQUEST, 'Your cart is empty');
    }

    const activeItems = cart.items.filter((i) => i.isActive === true);

    if (activeItems.length === 0) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'Please select at least one product from your cart to order'
      );
    }

    selectedItems = activeItems;
  } else {
    // ====== DIRECT CHECKOUT ======
    if (!payload.items || payload.items.length === 0) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'No items provided for checkout'
      );
    }

    if (payload.items.length > 1) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'Direct checkout supports only one product at a time'
      );
    }

    if (!payload.items[0].quantity) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'Quantity is required for direct checkout'
      );
    }

    selectedItems = payload.items;
  }

  // ---------- Check Product Stock ----------
  const productIds = selectedItems.map((i) => i.productId);
  const products = await Product.find({ productId: { $in: productIds } });

  const orderItems = selectedItems.map((item) => {
    const product = products.find((p) => p.productId === item.productId);

    if (!product)
      throw new AppError(
        httpStatus.NOT_FOUND,
        `Product not found: ${item.productId}`
      );

    if (product.stock.quantity < item.quantity)
      throw new AppError(
        httpStatus.BAD_REQUEST,
        `Stock not available for ${product.name}`
      );

    return {
      productId: product.productId,
      name: product.name,
      quantity: item.quantity,
      price: product.pricing.finalPrice,
      subtotal: product.pricing.finalPrice * item.quantity,
      vendorId: product.vendor.vendorId,
      estimatedDeliveryTime: payload?.estimatedDeliveryTime || 'N/A',
    };
  });

  // ---------- Calculate ----------
  const totalItems = orderItems.reduce((s, i) => s + i.quantity, 0);
  const rawTotalPrice = orderItems.reduce((s, i) => s + i.subtotal, 0);
  const totalPrice = parseFloat(rawTotalPrice.toFixed(2));
  const deliveryCharge = Number(payload.deliveryCharge || 0);
  const discount = Number(payload.discount || 0);

  const finalAmount = parseFloat(
    (totalPrice + deliveryCharge - discount).toFixed(2)
  );

  // Vendor check
  const vendorIds = orderItems.map((i) => i.vendorId);
  if (new Set(vendorIds).size > 1) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'You can only order products from ONE vendor at a time'
    );
  }

  // Delivery address
  const activeAddress = customer.deliveryAddresses?.find((a) => a.isActive);
  if (!activeAddress) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'No active delivery address found'
    );
  }

  return {
    customerId,
    vendorId: orderItems[0].vendorId,
    items: orderItems,
    discount: discount,
    totalItems,
    totalPrice,
    deliveryCharge,
    finalAmount,
    estimatedDeliveryTime: orderItems[0].estimatedDeliveryTime,
    deliveryAddress: activeAddress,
  };
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
  const meta = await orders.countTotal();
  const data = await orders.modelQuery;
  return {
    meta,
    data,
  };
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

  const meta = await orders.countTotal();
  const data = await orders.modelQuery;
  return {
    meta,
    data,
  };
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
  } else if (existingCurrentUser?.user?.role === 'DELIVERY_PARTNER') {
    order = await Order.findOne({ orderId, deliveryPartnerId: userId });
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

  // send notification to customer about order status update

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

// update order status service
const updateOrderStatus = async (
  orderId: string,
  status: keyof typeof ORDER_STATUS,
  currentUser: AuthUser
) => {
  const existingUser = await findUserByEmailOrId({
    userId: currentUser.id,
    isDeleted: false,
  });
  if (existingUser.user.status !== 'APPROVED') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      `You are not approved to update the order. Your account is ${existingUser.user.status}`
    );
  }
  const result = await Order.findOneAndUpdate(
    { orderId },
    { orderStatus: status },
    { new: true }
  );
  return result;
};

export const OrderServices = {
  checkout,
  getOrdersByVendor,
  getAllOrders,
  getSingleOrder,
  acceptOrRejectOrderByVendor,
  assignDeliveryPartner,
  updateOrderStatus,
};
