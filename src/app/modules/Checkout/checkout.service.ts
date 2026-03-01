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
import { roundTo2 } from '../../utils/mathProvider';

// Checkout Service
const checkout = async (currentUser: any, payload: TCheckoutPayload) => {
  const requiredFields = [
    { field: currentUser.name?.firstName, label: 'First Name' },
    { field: currentUser.contactNumber, label: 'Contact Number' },
    { field: currentUser.address?.city, label: 'City' },
  ];

  for (const item of requiredFields) {
    if (!item.field)
      throw new AppError(httpStatus.BAD_REQUEST, `${item.label} is required.`);
  }

  const customerId = currentUser._id.toString();
  let selectedItems = [];

  if (payload.useCart) {
    const cart = await Cart.findOne({ customerId, isDeleted: false });
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
  const globalSettings = await GlobalSettingsService.getGlobalSettings();

  const deliveryChargeBase = roundTo2(
    distance.meters * (globalSettings?.deliveryChargePerMeter || 0),
  );
  const deliveryVat = roundTo2(
    deliveryChargeBase * ((globalSettings?.deliveryVatRate || 0) / 100),
  );
  const totalDeliveryCharge = roundTo2(deliveryChargeBase + deliveryVat);

  const PLATFORM_COMMISSION_RATE =
    globalSettings?.platformCommissionPercent || 0;
  const COMMISSION_VAT_RATE = globalSettings?.platformCommissionVatRate || 0;

  const orderItems = selectedItems.map((item: any) => {
    const product = products.find(
      (p) => p._id.toString() === item.productId.toString(),
    );
    if (!product) throw new AppError(httpStatus.NOT_FOUND, 'Product not found');

    let basePrice = product.pricing?.price || 0;
    let selectedVariantLabel = '';
    if (item.variationSku && product.variations?.length) {
      const selectedOption = product.variations
        .flatMap((v: any) => v.options || [])
        .find((opt: any) => opt.sku === item.variationSku);
      if (selectedOption) {
        basePrice = selectedOption.price;
        selectedVariantLabel = selectedOption.label;
      }
    }

    const qty = item.itemSummary.quantity || 1;
    const storeDiscountUnit = roundTo2(
      basePrice * ((product.pricing?.discount || 0) / 100),
    );
    const priceAfterStoreDiscount = roundTo2(basePrice - storeDiscountUnit);

    const processedAddons = (item.addons || []).map((a: any) => {
      const aPrice = Number(a.unitPrice) || 0;
      const aQty = Number(a.quantity) || 0;
      const aTaxRate = Number(a.taxRate) || 0;

      const perUnitAddonTax =
        a.perUnitTaxAmount || roundTo2(aPrice * (aTaxRate / 100));

      const addonLineTotal = roundTo2(aPrice * aQty);

      const addonTax = roundTo2(perUnitAddonTax * aQty);
      return {
        optionId: a.optionId,
        name: a.name,
        sku: a.sku,
        originalPrice: a.originalPrice,
        promoDiscountAmount: 0,
        unitPrice: a.unitPrice,
        quantity: a.quantity,
        lineTotal: addonLineTotal,
        taxRate: a.taxRate || 0,
        perUnitTaxAmount: perUnitAddonTax,
        taxAmount: addonTax,
      };
    });

    const totalAddonsLineTotal = processedAddons.reduce(
      (sum: number, a: any) => sum + a.lineTotal,
      0,
    );
    const totalAddonsTax = processedAddons.reduce(
      (sum: number, a: any) => sum + a.taxAmount,
      0,
    );

    const productLineTotal = roundTo2(priceAfterStoreDiscount * qty);

    const productTaxRate = product.pricing?.taxRate || 0;
    const perUnitProductTax =
      item.productPricing?.perUnitTaxAmount ||
      roundTo2(priceAfterStoreDiscount * (productTaxRate / 100));

    const productTaxAmount = roundTo2(perUnitProductTax * qty);

    const itemTotalBeforeTax = roundTo2(
      productLineTotal + totalAddonsLineTotal,
    );
    const itemTotalTax = roundTo2(productTaxAmount + totalAddonsTax);

    const commAmt = roundTo2(
      itemTotalBeforeTax * (PLATFORM_COMMISSION_RATE / 100),
    );
    const commVat = roundTo2(commAmt * (COMMISSION_VAT_RATE / 100));

    const totalVendorDeduction = roundTo2(commAmt + commVat);

    const vendorNetEarnings = roundTo2(
      itemTotalBeforeTax + itemTotalTax - totalVendorDeduction,
    );
    const vendorEarningsWithoutTax = roundTo2(vendorNetEarnings - itemTotalTax);

    return {
      productId: product._id,
      vendorId: product.vendorId,
      name: selectedVariantLabel
        ? `${product.name} - ${selectedVariantLabel}`
        : product.name,
      image: product.images?.[0] || '',
      hasVariations: product.stock?.hasVariations || false,
      variationSku: item.variationSku || null,
      addons: processedAddons,
      productPricing: {
        originalPrice: basePrice,
        productDiscountAmount: storeDiscountUnit,
        priceAfterProductDiscount: priceAfterStoreDiscount,
        promoDiscountAmount: 0,
        unitPrice: priceAfterStoreDiscount,
        lineTotal: productLineTotal,
        taxRate: product.pricing?.taxRate || 0,
        perUnitTaxAmount: perUnitProductTax,
        taxAmount: productTaxAmount,
      },
      itemSummary: {
        quantity: qty,
        totalBeforeTax: itemTotalBeforeTax,
        totalTaxAmount: itemTotalTax,
        totalPromoDiscount: 0,
        totalProductDiscount: roundTo2(storeDiscountUnit * qty),
        grandTotal: roundTo2(itemTotalBeforeTax + itemTotalTax),
      },
      commission: {
        deliGoCommissionRate: PLATFORM_COMMISSION_RATE,
        deliGoCommissionAmount: commAmt,
        deliGoCommissionVatRate: COMMISSION_VAT_RATE,
        deliGoCommissionVatAmount: commVat,
      },
      vendor: {
        vendorEarningsWithoutTax,
        payableTax: itemTotalTax,
        vendorNetEarnings,
      },
    };
  });

  const totalOriginalPrice = orderItems.reduce(
    (sum, i) => sum + i.productPricing.originalPrice * i.itemSummary.quantity,
    0,
  );
  const totalProductDiscount = orderItems.reduce(
    (sum, i) => sum + i.itemSummary.totalProductDiscount,
    0,
  );
  const taxableAmount = orderItems.reduce(
    (sum, i) => sum + i.itemSummary.totalBeforeTax,
    0,
  );
  const totalTaxAmount = orderItems.reduce(
    (sum, i) => sum + i.itemSummary.totalTaxAmount,
    0,
  );

  const totalCommAmt = orderItems.reduce(
    (sum, i) => sum + i.commission.deliGoCommissionAmount,
    0,
  );
  const totalCommVat = orderItems.reduce(
    (sum, i) => sum + i.commission.deliGoCommissionVatAmount,
    0,
  );

  const fleetFee = roundTo2(
    deliveryChargeBase *
      ((globalSettings?.fleetManagerCommissionPercent || 0) / 100),
  );
  const grandTotal = roundTo2(
    taxableAmount + totalTaxAmount + totalDeliveryCharge,
  );

  const vendorNetPayout = roundTo2(
    taxableAmount + totalTaxAmount - (totalCommAmt + totalCommVat),
  );
  const vendorEarningsWithoutTax = roundTo2(vendorNetPayout - totalTaxAmount);

  const riderNetEarnings = roundTo2(totalDeliveryCharge - fleetFee);
  const riderEarningsWithoutTax = roundTo2(riderNetEarnings - deliveryVat);

  const finalSummaryData = {
    customerId,
    vendorId,
    customerEmail: currentUser?.email || '',
    contactNumber: currentUser?.contactNumber || '',
    items: orderItems,
    totalItems: orderItems.reduce(
      (s: number, i: any) => s + i.itemSummary.quantity,
      0,
    ),

    orderCalculation: {
      totalOriginalPrice: roundTo2(totalOriginalPrice),
      totalProductDiscount: roundTo2(totalProductDiscount),
      totalOfferDiscount: 0,
      taxableAmount: roundTo2(taxableAmount),
      totalTaxAmount: roundTo2(totalTaxAmount),
    },

    delivery: {
      charge: deliveryChargeBase,
      vatRate: globalSettings?.deliveryVatRate || 0,
      vatAmount: deliveryVat,
      totalDeliveryCharge: totalDeliveryCharge,
      distance: roundTo2(distance.km),
      estimatedTime: payload.estimatedDeliveryTime || '20-30 minutes',
    },

    payoutSummary: {
      grandTotal,
      deliGoCommission: {
        rate: PLATFORM_COMMISSION_RATE,
        amount: roundTo2(totalCommAmt),
        vatAmount: roundTo2(totalCommVat),
        totalDeduction: roundTo2(totalCommAmt + totalCommVat),
      },
      fleet: {
        rate: globalSettings?.fleetManagerCommissionPercent || 0,
        fee: fleetFee,
      },
      vendor: {
        earningsWithoutTax: vendorEarningsWithoutTax,
        payableTax: roundTo2(totalTaxAmount),
        vendorNetPayout,
      },
      rider: {
        earningsWithoutTax: riderEarningsWithoutTax,
        payableTax: deliveryVat,
        riderNetEarnings,
      },
    },

    offer: {
      isApplied: false,
      offerApplied: null,
    },

    deliveryAddress: activeAddress,
    paymentStatus: 'PENDING',
    isConvertedToOrder: false,
  };

  await CheckoutSummary.deleteMany({
    customerId,
    vendorId,
    isConvertedToOrder: false,
  });
  return await CheckoutSummary.create(finalSummaryData);
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
