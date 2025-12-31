/* eslint-disable @typescript-eslint/no-explicit-any */
import httpStatus from 'http-status';
import AppError from '../../errors/AppError';
import { CheckoutSummary } from './checkout.model';
import { Cart } from '../Cart/cart.model';
import { Vendor } from '../Vendor/vendor.model';
import { Product } from '../Product/product.model';
import { AuthUser } from '../../constant/user.constant';
import { Customer } from '../Customer/customer.model';
import { calculateDistance } from '../../utils/calculateDistance';
import { TCheckoutPayload } from './checkout.interface';
import { GlobalSettingsService } from '../GlobalSetting/globalSetting.service';
import { OfferServices } from '../Offer/offer.service';

// Checkout Service
const checkout = async (currentUser: AuthUser, payload: TCheckoutPayload) => {
  // ---------- Find Customer ----------
  const customer = await Customer.findOne({
    userId: currentUser.id,
    isDeleted: false,
  });
  if (!customer) {
    throw new AppError(httpStatus.NOT_FOUND, 'Customer not found');
  }

  // Validate address
  if (
    !customer.name?.firstName ||
    !customer.name?.lastName ||
    // !customer.contactNumber ||
    !customer.address?.state ||
    !customer.address?.city ||
    !customer.address?.country ||
    !customer.address?.postalCode
  )
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Please complete your profile before checking out'
    );

  if (!customer.email && !customer.contactNumber) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Please add email or contact number before checking out'
    );
  }

  const customerId = customer._id.toString();

  // ---------- Get items ----------
  let selectedItems = [];

  const cart = await Cart.findOne({ customerId, isDeleted: false });
  if (payload.useCart === true) {
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
    payload.discount = cart.discount;
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
  const productIds = selectedItems.map((i) => i.productId.toString());
  const products = await Product.find({ _id: { $in: productIds } });

  const firstProduct = products[0];
  if (!firstProduct)
    throw new AppError(httpStatus.NOT_FOUND, 'Product not found');

  const existingVendor = await Vendor.findById(firstProduct.vendorId);
  if (!existingVendor)
    throw new AppError(httpStatus.NOT_FOUND, 'Vendor not found');
  if (existingVendor?.businessDetails?.isStoreOpen === false) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Store is closed');
  }

  const deliveryAddress = customer?.deliveryAddresses?.find(
    (i) => i.isActive === true
  );

  const vendorLongitude = existingVendor?.businessLocation?.longitude;
  const vendorLatitude = existingVendor?.businessLocation?.latitude;
  const customerLongitude = deliveryAddress?.longitude;
  const customerLatitude = deliveryAddress?.latitude;

  if (
    !vendorLongitude ||
    !vendorLatitude ||
    !customerLongitude ||
    !customerLatitude
  ) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Delivery address not found');
  }
  const deliveryDistance = calculateDistance(
    vendorLongitude,
    vendorLatitude,
    customerLongitude,
    customerLatitude
  );
  const deliveryChargePerMeter = await GlobalSettingsService.getPerMeterRate();

  const deliveryCharge = deliveryDistance.meters * deliveryChargePerMeter;

  let totalTaxAmount = 0;
  let totalPriceBeforeTaxAndDelivery = 0;

  const orderItems = selectedItems.map((item) => {
    const product = products.find(
      (p) => p._id.toString() === item.productId.toString()
    );
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

    const unitPrice = product?.pricing?.price || 0;
    const taxRate = product?.pricing?.taxRate || 0;

    const addonsTotal = (item.addons || []).reduce(
      (sum: number, a: any) => sum + (a.price || 0) * a.quantity,
      0
    );

    const itemSubtotal = unitPrice * item.quantity + addonsTotal;
    const itemTax = (itemSubtotal * taxRate) / 100;

    totalTaxAmount += itemTax;
    totalPriceBeforeTaxAndDelivery += itemSubtotal;

    return {
      productId: product._id,
      vendorId: product.vendorId,
      name: product.name,
      image: product.images?.[0] || '',
      variantName: item.variantName,
      addons: item.addons || [],
      quantity: item.quantity,
      price: unitPrice,
      taxRate: taxRate,
      taxAmount: Number(itemTax.toFixed(2)),
      subtotal: Number(itemSubtotal?.toFixed(2)),
    };
  });

  // ---------- Calculate ----------
  const totalItems = orderItems.reduce((s, i) => s + i.quantity, 0);

  const totalPrice = parseFloat(totalPriceBeforeTaxAndDelivery.toFixed(2));
  const discount = Number(payload.discount || 0);
  const taxAmount = Number(totalTaxAmount.toFixed(2));

  const subTotal = parseFloat(
    (totalPrice - discount + deliveryCharge + taxAmount).toFixed(2)
  );

  // Vendor check
  const vendorIds = orderItems.map((i) => i.vendorId.toString());
  if (new Set(vendorIds).size > 1) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'You can only order products from ONE vendor at a time'
    );
  }

  // Apply offer
  const offer = await OfferServices.getApplicableOffer(
    {
      vendorId: orderItems[0].vendorId.toString(),
      subtotal: totalPrice,
      offerCode: payload.offerCode,
    },
    currentUser
  );
  console.log({ offer });

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
    contactNumber: customer?.contactNumber,
    vendorId: orderItems[0].vendorId,
    items: orderItems,
    totalItems,
    totalPrice: Number(totalPrice.toFixed(2)),
    taxAmount: Number(taxAmount.toFixed(2)),
    deliveryCharge: Number(deliveryCharge.toFixed(2)),
    discount,
    subTotal,
    estimatedDeliveryTime: payload.estimatedDeliveryTime || '20-30 minutes',
    deliveryAddress: activeAddress,
    couponId: cart?.couponId || null,
  };
  // -----------------------------------------------------------
  //  Prevent Duplicate Checkout Summary
  // -----------------------------------------------------------
  const existingSummary = await CheckoutSummary.findOne({
    customerId,
    vendorId: orderItems[0].vendorId.toString(),
    'items.productId': { $all: orderItems.map((i) => i.productId.toString()) },
    subTotal,
    isConvertedToOrder: false,
  });

  if (existingSummary) {
    return {
      CheckoutSummaryId: existingSummary._id,
      subTotal: existingSummary.subTotal,
      items: existingSummary.items,
      vendorId: existingSummary.vendorId,
      reused: true,
    };
  }

  const summary = await CheckoutSummary.create(summaryData);

  return {
    CheckoutSummaryId: summary._id,
    vendorId: summary.vendorId,
    subTotal: summary.subTotal,
    taxAmount: summary.taxAmount,
    deliveryCharge: summary.deliveryCharge,
    items: summary.items,
  };
};

// get checkout summary
const getCheckoutSummary = async (
  checkoutSummaryId: string,
  currentUser: AuthUser
) => {
  const existingCustomer = await Customer.findOne({
    userId: currentUser.id,
    isDeleted: false,
  });
  if (!existingCustomer) {
    throw new AppError(httpStatus.NOT_FOUND, 'Customer not found');
  }

  if (existingCustomer.status !== 'APPROVED') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      `You are not approved to view the order. Your account is ${existingCustomer.status}`
    );
  }
  const summary = await CheckoutSummary.findById(checkoutSummaryId);

  if (!summary) {
    throw new AppError(httpStatus.NOT_FOUND, 'Checkout summary not found');
  }

  if (summary.customerId.toString() !== existingCustomer._id.toString()) {
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

  return summary;
};

export const CheckoutServices = {
  checkout,
  getCheckoutSummary,
};
