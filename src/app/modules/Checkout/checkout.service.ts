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

// Checkout Service

const checkout = async (currentUser: any, payload: TCheckoutPayload) => {
  const requiredFields = [
    { field: currentUser.name?.firstName, label: 'First Name' },
    { field: currentUser.contactNumber, label: 'Contact Number' },
    { field: currentUser.address?.city, label: 'City' },
    { field: currentUser.address?.street, label: 'Street' },
  ];

  for (const item of requiredFields) {
    if (!item.field)
      throw new AppError(httpStatus.BAD_REQUEST, `${item.label} is required.`);
  }

  const customerId = currentUser._id.toString();
  let selectedItems = [];
  const cart = await Cart.findOne({ customerId, isDeleted: false });

  if (payload.useCart) {
    if (!cart || cart.items.length === 0)
      throw new AppError(httpStatus.BAD_REQUEST, 'Cart is empty');
    selectedItems = cart.items.filter((i: any) => i.isActive === true);
    if (selectedItems.length === 0)
      throw new AppError(httpStatus.BAD_REQUEST, 'No active items in cart');
  } else {
    if (!payload.items || payload.items.length !== 1)
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'Direct checkout supports 1 item',
      );
    selectedItems = payload.items;
  }

  const productIds = selectedItems.map((i: any) => i.productId.toString());
  const products = await Product.find({ _id: { $in: productIds } });
  if (products.length === 0)
    throw new AppError(httpStatus.NOT_FOUND, 'Products not found');

  const vendorId = products[0].vendorId;
  const existingVendor = await Vendor.findById(vendorId);
  if (!existingVendor || !existingVendor.businessDetails?.isStoreOpen) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Vendor is closed');
  }

  const activeAddress = currentUser?.deliveryAddresses?.find(
    (i: any) => i.isActive === true,
  );
  const vendorCoords = existingVendor.currentSessionLocation?.coordinates;

  if (!activeAddress || !vendorCoords || vendorCoords.length < 2) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Location data missing');
  }

  const distance = calculateDistance(
    vendorCoords[0],
    vendorCoords[1],
    activeAddress.longitude,
    activeAddress.latitude,
  );
  const globalSettingsData = await GlobalSettingsService.getGlobalSettings();
  const deliveryChargePerMeter = globalSettingsData?.deliveryChargePerMeter;
  const deliveryChargeNet =
    parseFloat((distance.meters * deliveryChargePerMeter).toFixed(2)) || 0;
  const DELIVERY_VAT_RATE = globalSettingsData?.deliveryVatRate;
  const deliveryVatAmount =
    parseFloat((deliveryChargeNet * (DELIVERY_VAT_RATE! / 100)).toFixed(2)) ||
    0;

  let totalFoodVatAccumulator = 0;
  let totalNetFoodPriceAccumulator = 0;
  let totalDeliGoCommission = 0;
  let totalCommissionVat = 0;

  const PLATFORM_COMMISSION_RATE =
    globalSettingsData?.platformCommissionPercent;
  const COMMISSION_VAT_RATE = globalSettingsData?.platformCommissionVatRate;
  const orderItems = selectedItems.map((item: any) => {
    const product = products.find(
      (p) => p._id.toString() === item.productId.toString(),
    );
    if (!product) throw new AppError(httpStatus.NOT_FOUND, 'Product not found');

    let basePrice = product.pricing?.price || 0;
    if (item.variationSku && product.variations?.length) {
      const selectedOption = product.variations
        .flatMap((v: any) => v.options || [])
        .find((opt: any) => opt.sku === item.variationSku);
      if (selectedOption) basePrice = selectedOption.price || basePrice;
    }

    const discountPercent = product.pricing?.discount || 0;
    const discountAmountPerUnit =
      parseFloat((basePrice * (discountPercent / 100)).toFixed(2)) || 0;
    const unitPriceAfterDiscount = basePrice - discountAmountPerUnit;
    const quantity = item.quantity || 1;

    const productTotalBeforeTax =
      parseFloat((unitPriceAfterDiscount * quantity).toFixed(2)) || 0;
    const taxRate = product.pricing?.taxRate || 13;
    const productTaxAmount =
      parseFloat((productTotalBeforeTax * (taxRate / 100)).toFixed(2)) || 0;

    const processedAddons = (item.addons || []).map((a: any) => {
      const addonPrice = a.price || 0;
      const addonQty = a.quantity || 0;
      const addonTaxRate = a.taxRate || 23;
      const addonTax =
        parseFloat((addonPrice * addonQty * (addonTaxRate / 100)).toFixed(2)) ||
        0;
      return {
        ...a,
        price: addonPrice,
        quantity: addonQty,
        taxAmount: addonTax,
      };
    });

    const addonsTotalNet =
      processedAddons.reduce(
        (sum: number, a: any) => sum + a.price * a.quantity,
        0,
      ) || 0;
    const addonsTotalTax =
      processedAddons.reduce(
        (sum: number, a: any) => sum + (a.taxAmount || 0),
        0,
      ) || 0;

    const itemTotalBeforeTax =
      parseFloat((productTotalBeforeTax + addonsTotalNet).toFixed(2)) || 0;
    const itemTaxAmount =
      parseFloat((productTaxAmount + addonsTotalTax).toFixed(2)) || 0;
    const itemSubtotal =
      parseFloat((itemTotalBeforeTax + itemTaxAmount).toFixed(2)) || 0;

    const itemCommissionNet =
      parseFloat(
        (itemTotalBeforeTax * (PLATFORM_COMMISSION_RATE / 100)).toFixed(2),
      ) || 0;
    const itemCommissionVat =
      parseFloat(
        (itemCommissionNet * (COMMISSION_VAT_RATE / 100)).toFixed(2),
      ) || 0;
    const itemVendorEarnings =
      parseFloat(
        (itemSubtotal - (itemCommissionNet + itemCommissionVat)).toFixed(2),
      ) || 0;

    totalFoodVatAccumulator += itemTaxAmount;
    totalNetFoodPriceAccumulator += itemTotalBeforeTax;
    totalDeliGoCommission += itemCommissionNet;
    totalCommissionVat += itemCommissionVat;

    return {
      productId: product._id,
      vendorId: product.vendorId,
      name:
        item.variationSku && product.variations
          ? `${product.name} - ${product.variations.flatMap((v) => v.options).find((o) => o.sku === item.variationSku)?.label || ''}`
          : product.name,
      image: product.images?.[0] || '',
      hasVariations: product.stock?.hasVariations || false,
      variationSku: item.variationSku || null,
      quantity,
      originalPrice: basePrice,
      discountAmount: discountAmountPerUnit,
      price: unitPriceAfterDiscount,
      addons: processedAddons,
      productTotalBeforeTax,
      productTaxAmount: parseFloat(productTaxAmount.toFixed(2)),
      totalBeforeTax: itemTotalBeforeTax,
      taxRate,
      taxAmount: itemTaxAmount,
      subtotal: itemSubtotal,
      commissionRate: PLATFORM_COMMISSION_RATE,
      commissionAmount: itemCommissionNet,
      commissionVatRate: COMMISSION_VAT_RATE,
      commissionVatAmount: itemCommissionVat,
      vendorNetEarnings: itemVendorEarnings,
    };
  });

  const totalPriceGross =
    parseFloat(totalNetFoodPriceAccumulator.toFixed(2)) || 0;
  const totalTaxAmount = parseFloat(totalFoodVatAccumulator.toFixed(2)) || 0;

  const offer = await OfferServices.getApplicableOffer(
    {
      vendorId: vendorId.toString(),
      subtotal: totalPriceGross,
      offerCode: payload.offerCode,
    },
    currentUser,
  );

  const offerResult = OfferServices.applyOffer({
    offer,
    items: orderItems,
    totalPriceBeforeTax: totalPriceGross,
    taxAmount: totalTaxAmount,
    deliveryCharge: deliveryChargeNet,
  });

  const offerDiscount = offerResult?.discount || 0;

  const fleetManagerCommissionPercent = parseFloat(
    (globalSettingsData.fleetManagerCommissionPercent! / 100).toFixed(2),
  );

  const fleetFee =
    parseFloat(
      (deliveryChargeNet * fleetManagerCommissionPercent).toFixed(2),
    ) || 0;

  const summaryData = {
    customerId,
    vendorId,
    customerEmail: currentUser?.email || '',
    contactNumber: currentUser?.contactNumber || '',
    items: orderItems,
    totalItems:
      orderItems.reduce((s: number, i: any) => s + i.quantity, 0) || 0,
    totalPrice: totalPriceGross,
    taxAmount: totalTaxAmount,
    deliveryCharge: deliveryChargeNet,
    deliveryVatRate: DELIVERY_VAT_RATE,
    deliveryVatAmount,
    deliGoCommission: parseFloat(totalDeliGoCommission.toFixed(2)) || 0,
    commissionVat: parseFloat(totalCommissionVat.toFixed(2)) || 0,
    fleetFee,
    riderNetEarnings:
      parseFloat(
        (
          deliveryChargeNet +
          deliveryVatAmount -
          deliveryChargeNet * 0.04
        ).toFixed(2),
      ) || 0,
    discount: parseFloat(offerDiscount.toFixed(2)) || 0,
    subtotal:
      parseFloat(
        (
          totalPriceGross +
          totalTaxAmount +
          deliveryChargeNet +
          deliveryVatAmount -
          offerDiscount
        ).toFixed(2),
      ) || 0,
    offerApplied: offerResult?.appliedOffer || null,
    couponId: cart?.couponId || (offer?._id ? offer._id : null),
    deliveryAddress: activeAddress,
    estimatedDeliveryTime: payload.estimatedDeliveryTime || '20-30 minutes',
    isConvertedToOrder: false,
  };

  await CheckoutSummary.deleteMany({
    customerId,
    vendorId,
    isConvertedToOrder: false,
  });
  return await CheckoutSummary.create(summaryData);
};

// get checkout summary
const getCheckoutSummary = async (
  checkoutSummaryId: string,
  currentUser: AuthUser,
) => {
  if (currentUser.status !== 'APPROVED') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      `You are not approved to view the order. Your account is ${currentUser.status}`,
    );
  }
  const summary = await CheckoutSummary.findById(checkoutSummaryId);

  if (!summary) {
    throw new AppError(httpStatus.NOT_FOUND, 'Checkout summary not found');
  }

  if (summary.customerId.toString() !== currentUser._id.toString()) {
    throw new AppError(
      httpStatus.UNAUTHORIZED,
      'You are not authorized to view',
    );
  }

  if (summary.isConvertedToOrder) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Checkout summary already converted to order',
    );
  }

  return summary;
};

export const CheckoutServices = {
  checkout,
  getCheckoutSummary,
};
