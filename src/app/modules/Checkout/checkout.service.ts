import httpStatus from 'http-status';
import AppError from '../../errors/AppError';
import { CheckoutSummary } from './checkout.model';
import { Cart } from '../Cart/cart.model';
import { Vendor } from '../Vendor/vendor.model';
import { Product } from '../Product/product.model';
import { AuthUser } from '../../constant/user.constant';
import { Customer } from '../Customer/customer.model';
import { GlobalSettingServices } from '../GlobalSetting/globalSetting.service';
import { calculateDistance } from '../../utils/calculateDistance';
import { findUserByEmailOrId } from '../../utils/findUserByEmailOrId';
import { TCheckoutPayload } from './checkout.interface';

// Checkout Service
const checkout = async (currentUser: AuthUser, payload: TCheckoutPayload) => {
  const customerId = currentUser?.id;

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
    !customer.address?.postalCode
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
  const deliveryAddress = customer?.deliveryAddresses?.find(
    (i) => i.isActive === true
  );
  const existingVendor = await Vendor.findOne({
    userId: products[0].vendor.vendorId,
  });

  const vendorLatitude = existingVendor?.businessLocation?.latitude;
  const vendorLongitude = existingVendor?.businessLocation?.longitude;
  const customerLatitude = deliveryAddress?.latitude;
  const customerLongitude = deliveryAddress?.longitude;
  if (
    !vendorLatitude ||
    !vendorLongitude ||
    !customerLatitude ||
    !customerLongitude
  ) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Delivery address not found');
  }
  const deliveryDistance = calculateDistance(
    vendorLatitude,
    vendorLongitude,
    customerLatitude,
    customerLongitude
  );
  const deliveryChargePerMeter = await GlobalSettingServices.getPerMeterRate();

  const deliveryCharge = deliveryDistance.meters * deliveryChargePerMeter;

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
  const summaryData = {
    customerId,
    customerEmail: customer?.email,
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

  // -----------------------------------------------------------
  //  Prevent Duplicate Checkout Summary
  // -----------------------------------------------------------
  const existingSummary = await CheckoutSummary.findOne({
    customerId,
    vendorId: orderItems[0].vendorId,
    'items.productId': { $all: orderItems.map((i) => i.productId) },
    finalAmount: finalAmount,
    isConvertedToOrder: false,
  });

  if (existingSummary) {
    return {
      CheckoutSummaryId: existingSummary._id,
      finalAmount: existingSummary.finalAmount,
      items: existingSummary.items,
      vendorId: existingSummary.vendorId,
      reused: true,
    };
  }

  const summary = await CheckoutSummary.create(summaryData);

  return {
    CheckoutSummaryId: summary._id,
    finalAmount: summary.finalAmount,
    items: summary.items,
    vendorId: summary.vendorId,
  };
};

// get checkout summary
const getCheckoutSummary = async (
  checkoutSummaryId: string,
  currentUser: AuthUser
) => {
  await findUserByEmailOrId({ userId: currentUser.id, isDeleted: false });
  const summary = await CheckoutSummary.findById(checkoutSummaryId);

  if (!summary) {
    throw new AppError(httpStatus.NOT_FOUND, 'Checkout summary not found');
  }

  if (summary.customerId !== currentUser.id) {
    throw new AppError(
      httpStatus.UNAUTHORIZED,
      'You are not authorized to view'
    );
  }

  if (summary.isConvertedToOrder) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Checkout summary already converted to order'
    );
  }

  if (summary.isDeleted) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Checkout summary deleted');
  }

  return summary;
};

export const CheckoutServices = {
  checkout,
  getCheckoutSummary,
};
