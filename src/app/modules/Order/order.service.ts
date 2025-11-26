import httpStatus from 'http-status';
import { AuthUser } from '../../constant/user.constant';
import AppError from '../../errors/AppError';
import { Order } from './order.model';
import { QueryBuilder } from '../../builder/QueryBuilder';
import { findUserByEmailOrId } from '../../utils/findUserByEmailOrId';
import { ORDER_STATUS, OrderSearchableFields } from './order.constant';
import { Vendor } from '../Vendor/vendor.model';
import { DeliveryPartner } from '../Delivery-Partner/delivery-partner.model';
import { CheckoutSummary } from '../Checkout/checkout.model';
import { stripe } from '../Payment/payment.service';
import { Cart } from '../Cart/cart.model';
import { Product } from '../Product/product.model';

const createOrderAfterPayment = async (
  payload: {
    checkoutSummaryId: string;
    paymentIntentId: string;
  },
  currentUser: AuthUser
) => {
  await findUserByEmailOrId({ userId: currentUser?.id, isDeleted: false });
  const { checkoutSummaryId, paymentIntentId } = payload;
  const summary = await CheckoutSummary.findById(checkoutSummaryId);

  if (!summary) {
    throw new AppError(httpStatus.NOT_FOUND, 'Checkout summary not found');
  }

  if (summary.isConvertedToOrder) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Order already created for this payment'
    );
  }

  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

  if (paymentIntent.status !== 'succeeded') {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Payment is not successful. Order cannot be created.'
    );
  }
  console.log(summary.items);

  // --------------------------------------------------------------
  // Reduce Product Stock
  // --------------------------------------------------------------
  const stockOperations = summary.items.map((item) => ({
    updateOne: {
      filter: { productId: item.productId },
      update: {
        $inc: { 'stock.quantity': -item.quantity },
      },
    },
  }));

  await Product.bulkWrite(stockOperations);

  // --------------------------------------------------------------
  // Clear Purchased Items from Cart
  // --------------------------------------------------------------
  await Cart.updateOne(
    { customerId: summary.customerId },
    {
      $pull: {
        items: {
          productId: { $in: summary.items.map((i) => i.productId) },
        },
      },
      $inc: {
        totalItems: -summary.totalItems,
        totalPrice: -summary.totalPrice,
      },
    }
  );

  const orderData = {
    orderId: `ORD-${Date.now()}`,
    customerId: summary.customerId,
    vendorId: summary.vendorId,

    items: summary.items.map((item) => ({
      productId: item.productId,
      name: item.name,
      quantity: item.quantity,
      price: item.price,
      subtotal: item.subtotal,
    })),

    totalItems: summary.totalItems,
    totalPrice: summary.totalPrice,
    discount: summary.discount,
    finalAmount: summary.finalAmount,

    paymentMethod: 'CARD',
    paymentStatus: 'COMPLETED',
    isPaid: true,

    deliveryAddress: summary.deliveryAddress,
    deliveryCharge: summary.deliveryCharge,
    estimatedDeliveryTime: summary.estimatedDeliveryTime,

    transactionId: paymentIntentId,
  };

  const order = await Order.create(orderData);

  summary.isConvertedToOrder = true;
  summary.paymentStatus = 'paid';
  summary.transactionId = paymentIntentId;
  summary.orderId = order.orderId;

  await summary.save();

  return order;
};

// get all order service
const getAllOrders = async (
  query: Record<string, unknown>,
  currentUser: AuthUser
) => {
  const result = await findUserByEmailOrId({
    userId: currentUser.id,
    isDeleted: false,
  });

  const loggedInUser = result.user;
  if (loggedInUser.status !== 'APPROVED') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      `You are not approved to view orders. Your account is ${loggedInUser.status}`
    );
  }
  if (loggedInUser.role === 'DELIVERY_PARTNER') {
    query.orderStatus = 'ACCEPTED';
  }

  if (loggedInUser.role === 'VENDOR') {
    query.vendorId = loggedInUser.userId;
  }

  if (loggedInUser.role === 'CUSTOMER') {
    query.customerId = loggedInUser.userId;
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
  const result = await findUserByEmailOrId({
    userId: currentUser.id,
    isDeleted: false,
  });

  const loggedInUser = result.user;
  if (loggedInUser.status !== 'APPROVED') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      `You are not approved to view the order. Your account is ${loggedInUser.status}`
    );
  }

  let order;
  const userId = loggedInUser.userId;
  if (loggedInUser?.role === 'CUSTOMER') {
    order = await Order.findOne({ orderId, customerId: userId });
  } else if (loggedInUser?.role === 'VENDOR') {
    order = await Order.findOne({ orderId, vendorId: userId });
  } else if (loggedInUser?.role === 'DELIVERY_PARTNER') {
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

  const order = await Order.findOne({
    orderId,
    vendorId: existingVendor.userId,
    isDeleted: false,
  });
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
      street: existingVendor.businessLocation?.street || '',
      city: existingVendor.businessLocation?.city || '',
      state: existingVendor.businessLocation?.state || '',
      country: existingVendor.businessLocation?.country || '',
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
  createOrderAfterPayment,
  getAllOrders,
  getSingleOrder,
  acceptOrRejectOrderByVendor,
  assignDeliveryPartner,
  updateOrderStatus,
};
