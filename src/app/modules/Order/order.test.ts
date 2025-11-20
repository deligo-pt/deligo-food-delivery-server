import httpStatus from 'http-status';
import { AuthUser } from '../../constant/user.const';
import AppError from '../../errors/AppError';
import { getUserFcmToken } from '../../utils/getUserFcmToken';
import { Cart } from '../Cart/cart.model';
import { Customer } from '../Customer/customer.model';
import { NotificationService } from '../Notification/notification.service';
import { Product } from '../Product/product.model';
import { TOrder } from './order.interface';
import { Order } from './order.model';

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
    !customer.name?.firstName ||
    !customer.name?.lastName ||
    !customer.contactNumber ||
    !customer.address?.state ||
    !customer.address?.city ||
    !customer.address?.country ||
    !customer.address?.postalCode
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
    }, ${addr?.country || ''} - ${addr?.postalCode || ''}`;
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
  const deliveryCharge = payload?.deliveryCharge || 0;
  const estimatedDeliveryTime = payload?.estimatedDeliveryTime || null;

  // -------- Check if delivery charge is valid --------
  if (deliveryCharge < 0) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Delivery charge cannot be negative'
    );
  }

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
      deliveryCharge,
      estimatedDeliveryTime,
      paymentMethod: 'CARD',
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

  if (!order) {
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Order creation failed due to payment issues'
    );
  }

  if (order) {
    const customerToken = await getUserFcmToken(customerId);
    const vendorToken = await getUserFcmToken(vendorId);
    if (customerToken) {
      // send notification to customer
      await NotificationService.sendToUser(
        customerId,
        'Order Placed',
        `Your order ${order.orderId} has been placed successfully.`,
        { orderId: order.orderId },
        'ORDER'
      );
    }

    if (vendorToken) {
      // send notification to vendor
      await NotificationService.sendToUser(
        vendorId!,
        'New Order Received',
        `You have received a new order ${order.orderId}.`,
        { orderId: order.orderId },
        'ORDER'
      );
    }
  }

  return order;
};

export const OrderServices = {
  createOrder,
};
