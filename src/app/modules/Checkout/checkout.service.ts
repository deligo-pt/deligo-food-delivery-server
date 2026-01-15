/* eslint-disable @typescript-eslint/no-explicit-any */
import httpStatus from 'http-status';
import AppError from '../../errors/AppError';
import { CheckoutSummary } from './checkout.model';
import { Cart } from '../Cart/cart.model';
import { Vendor } from '../Vendor/vendor.model';
import { Product } from '../Product/product.model';
import { AuthUser } from '../../constant/user.constant';
import { calculateDistance } from '../../utils/calculateDistance';
import { TCheckoutPayload } from './checkout.interface';
import { GlobalSettingsService } from '../GlobalSetting/globalSetting.service';
import { OfferServices } from '../Offer/offer.service';
import mongoose from 'mongoose';

// Checkout Service
const checkout = async (currentUser: AuthUser, payload: TCheckoutPayload) => {
  // Validate address
  const requiredFields = [
    { field: currentUser.name?.firstName, label: 'First Name' },
    { field: currentUser.name?.lastName, label: 'Last Name' },
    { field: currentUser.contactNumber, label: 'Contact Number' },
    { field: currentUser.address?.state, label: 'State' },
    { field: currentUser.address?.city, label: 'City' },
    { field: currentUser.address?.country, label: 'Country' },
    { field: currentUser.address?.postalCode, label: 'Postal Code' },
  ];

  for (const item of requiredFields) {
    if (!item.field) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        `Please provide your ${item.label} to complete your profile before checking out.`
      );
    }
  }

  if (!currentUser.email && !currentUser.contactNumber) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Please add email or contact number before checking out'
    );
  }

  const customerId = currentUser._id.toString();

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
    if (!payload.items || payload.items.length !== 1) {
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
  if (
    !existingVendor ||
    existingVendor?.businessDetails?.isStoreOpen === false
  ) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Vendor unavailable or store closed'
    );
  }

  const activeAddress = currentUser?.deliveryAddresses?.find(
    (i) => i.isActive === true
  );
  if (!activeAddress) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Please add a delivery address before checking out'
    );
  }

  const vendorLongitude = existingVendor?.businessLocation?.longitude;
  const vendorLatitude = existingVendor?.businessLocation?.latitude;
  const customerLongitude = activeAddress?.longitude;
  const customerLatitude = activeAddress?.latitude;

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
  let totalPriceBeforeTax = 0;

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

    const unitPrice = item.price || product?.pricing?.price || 0;
    const taxRate = product?.pricing?.taxRate || 0;

    const addonsTotal = (item.addons || []).reduce(
      (sum: number, a: any) => sum + (a.price || 0) * a.quantity,
      0
    );

    const itemTotalBeforeTax = parseFloat(
      (unitPrice * item.quantity + addonsTotal).toFixed(2)
    );
    const itemTax = parseFloat(
      (itemTotalBeforeTax * (taxRate / 100)).toFixed(2)
    );
    const itemSubtotalWithTax = parseFloat(
      (itemTotalBeforeTax + itemTax).toFixed(2)
    );

    totalPriceBeforeTax += itemTotalBeforeTax;
    totalTaxAmount += itemTax;

    return {
      productId: product._id as mongoose.Types.ObjectId,
      vendorId: product.vendorId as mongoose.Types.ObjectId,
      name: product.name,
      image: product.images?.[0] || '',
      variantName: item.variantName,
      addons: item.addons || [],
      quantity: item.quantity,
      price: unitPrice,
      taxRate: taxRate,
      taxAmount: itemTax,
      totalBeforeTax: itemTotalBeforeTax,
      subtotal: itemSubtotalWithTax,
    };
  });

  // ---------- Calculate ----------
  const totalItems = orderItems.reduce((s, i) => s + i.quantity, 0);
  // const discount = Number(payload.discount || 0);

  const totalPrice = parseFloat(totalPriceBeforeTax.toFixed(2));

  // const finalSubTotal = parseFloat(
  //   (totalPriceBeforeTax + totalTaxAmount + deliveryCharge - discount).toFixed(
  //     2
  //   )
  // );

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

  const offerResult = OfferServices.applyOffer({
    offer,
    items: orderItems,
    totalPriceBeforeTax,
    taxAmount: totalTaxAmount,
    deliveryCharge,
  });

  const summaryData = {
    customerId,
    customerEmail: currentUser?.email,
    contactNumber: currentUser?.contactNumber,
    vendorId: orderItems[0].vendorId,
    items: orderItems,
    totalItems,
    totalPrice: Number(totalPrice.toFixed(2)),
    taxAmount: Number(totalTaxAmount.toFixed(2)),
    deliveryCharge: offerResult.deliveryCharge,
    discount: offerResult.discount,
    subTotal: offerResult.subTotal,
    appliedOffer: offerResult.appliedOffer,
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
    subTotal: offerResult.subTotal,
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

  return summary;
};

// get checkout summary
const getCheckoutSummary = async (
  checkoutSummaryId: string,
  currentUser: AuthUser
) => {
  if (currentUser.status !== 'APPROVED') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      `You are not approved to view the order. Your account is ${currentUser.status}`
    );
  }
  const summary = await CheckoutSummary.findById(checkoutSummaryId);

  if (!summary) {
    throw new AppError(httpStatus.NOT_FOUND, 'Checkout summary not found');
  }

  if (summary.customerId.toString() !== currentUser._id.toString()) {
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
