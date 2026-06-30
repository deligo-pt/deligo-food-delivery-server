/* eslint-disable @typescript-eslint/no-explicit-any */
import httpStatus from 'http-status';
import AppError from '../../errors/AppError';
import { CheckoutSummary } from './checkout.model';
import { Cart } from '../Cart/cart.model';
import { Vendor } from '../Vendor/vendor.model';
import { Product } from '../Product/product.model';
import { TCurrentUser } from '../../constant/GlobalInterface/user.interface';
import { TCheckoutPayload } from './checkout.interface';
import { GlobalSettingsService } from '../GlobalSetting/globalSetting.service';
import { roundTo2 } from '../../utils/mathProvider';
import { calculateGoogleRoadDistance } from '../../utils/calculateGoggleRoadDistance';
import { RedisService } from '../../config/redis';

// Checkout Service
const checkout = async (
  currentUser: TCurrentUser,
  payload: TCheckoutPayload,
) => {
  const customerId = currentUser._id.toString();
  let selectedItems = [];

  if (payload.useCart) {
    const dataKey = `cart:data:${customerId}`;

    let cart = await RedisService.get<any>(dataKey);

    if (!cart) {
      cart = await Cart.findOne({ customerId, isDeleted: false }).lean();
    }

    if (!cart || !cart.items || cart.items.length === 0)
      throw new AppError(httpStatus.BAD_REQUEST, 'CART_EMPTY');

    selectedItems = cart.items.filter((i: any) => i.isActive === true);
    if (selectedItems.length === 0)
      throw new AppError(httpStatus.BAD_REQUEST, 'NO_ACTIVE_CART_ITEMS');
  } else {
    if (!payload.items || payload.items.length !== 1)
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'DIRECT_CHECKOUT_SINGLE_ITEM_ONLY',
      );
    selectedItems = payload.items;
  }

  const productIds = selectedItems.map((i: any) => i.productId.toString());
  const products = await Product.find({ _id: { $in: productIds } }).lean();
  if (products.length === 0)
    throw new AppError(httpStatus.NOT_FOUND, 'PRODUCTS_NOT_FOUND');

  const vendorId = products[0].vendorId;
  const existingVendor = await Vendor.findById(vendorId).lean();
  if (!existingVendor || !existingVendor.businessDetails?.isStoreOpen) {
    throw new AppError(httpStatus.BAD_REQUEST, 'VENDOR_CLOSED');
  }

  const activeAddress = currentUser?.deliveryAddresses?.find(
    (i: any) => i.isActive === true,
  );

  if (!activeAddress) {
    throw new AppError(httpStatus.BAD_REQUEST, 'NO_ACTIVE_DELIVERY_ADDRESS');
  }

  if (
    !activeAddress.latitude ||
    !activeAddress.longitude ||
    !activeAddress.city ||
    !activeAddress.street
  ) {
    throw new AppError(httpStatus.BAD_REQUEST, 'DELIVERY_ADDRESS_INCOMPLETE');
  }

  const vendorLocation = existingVendor.businessLocation;
  if (!vendorLocation?.longitude || !vendorLocation?.latitude) {
    throw new AppError(httpStatus.BAD_REQUEST, 'VENDOR_LOCATION_NOT_FOUND');
  }

  const { latitude, longitude } = vendorLocation;

  const distanceData = await calculateGoogleRoadDistance(
    longitude,
    latitude,
    activeAddress.longitude || 0,
    activeAddress.latitude || 0,
  );

  const globalSettings = await GlobalSettingsService.getGlobalSettings();
  const deliveryVatRate = globalSettings?.deliveryVatRate || 0;
  const serviceCharge = globalSettings?.serviceCharge || 0;

  const BASE_FIXED_DELIVERY_CHARGE = globalSettings?.baseDeliveryCharge || 0;

  const deliveryChargeBase =
    distanceData.meters <= 1000
      ? BASE_FIXED_DELIVERY_CHARGE || 0
      : roundTo2(distanceData.km * (globalSettings?.deliveryChargePerKm || 0));
  const deliveryGrossRaw = deliveryChargeBase * (1 + deliveryVatRate / 100);

  const totalDeliveryCharge = roundTo2(deliveryGrossRaw);
  const deliveryVat = roundTo2(totalDeliveryCharge - deliveryChargeBase);

  const PLATFORM_COMMISSION_RATE =
    globalSettings?.platformCommissionPercent || 0;
  const COMMISSION_VAT_RATE = globalSettings?.platformCommissionVatRate || 0;

  const orderItems = selectedItems.map((item: any) => {
    const product = products.find(
      (p) => p._id.toString() === item.productId.toString(),
    );
    if (!product) throw new AppError(httpStatus.NOT_FOUND, 'PRODUCT_NOT_FOUND');

    let basePrice = product.pricing?.price || 0;

    // --- ১. লোকালইজড নাম অবজেক্ট প্রিপারেশন (en, pt দুটাই থাকবে) ---
    let finalItemNameObj = { en: '', pt: '' };

    if (payload.useCart && item.name && typeof item.name === 'object') {
      finalItemNameObj = {
        en: item.name.en || '',
        pt: item.name.pt || item.name.en || '',
      };
    } else {
      finalItemNameObj = {
        en: product.name?.en || '',
        pt: product.name?.pt || product.name?.en || '',
      };
    }

    if (item.variationSku && product.variations?.length) {
      const selectedOption = product.variations
        .flatMap((v: any) => v.options || [])
        .find((opt: any) => opt.sku === item.variationSku);

      if (selectedOption) {
        basePrice = selectedOption.price;

        // ডিরেক্ট চেকাউটের ক্ষেত্রে ভ্যারিয়েন্ট লেবেল অ্যাপেন্ড করা
        if (!payload.useCart) {
          const vLabelEn =
            typeof selectedOption.label === 'object'
              ? selectedOption.label.en || ''
              : selectedOption.label;
          const vLabelPt =
            typeof selectedOption.label === 'object'
              ? selectedOption.label.pt || vLabelEn
              : selectedOption.label;

          if (vLabelEn)
            finalItemNameObj.en = `${finalItemNameObj.en} - ${vLabelEn}`;
          if (vLabelPt)
            finalItemNameObj.pt = `${finalItemNameObj.pt} - ${vLabelPt}`;
        }
      }
    }

    const qty = item.itemSummary?.quantity || item.quantity || 1;

    const storeDiscountUnit = roundTo2(
      basePrice * ((product.pricing?.discount || 0) / 100),
    );
    const priceAfterStoreDiscount = roundTo2(basePrice - storeDiscountUnit);

    // --- ২. অ্যাড-অনের লোকালইজড নাম অবজেক্ট প্রসেসিং ---
    const processedAddons = (item.addons || []).map((a: any) => {
      const aPrice = Number(a.unitPrice) || 0;
      const aQty = Number(a.quantity) || 0;
      const aTaxRate = Number(a.taxRate) || 0;
      const addonLineNet = roundTo2(aPrice * aQty);

      let finalAddonNameObj = { en: '', pt: '' };
      if (a.name && typeof a.name === 'object') {
        finalAddonNameObj = {
          en: a.name.en || '',
          pt: a.name.pt || a.name.en || '',
        };
      } else {
        finalAddonNameObj = { en: a.name || '', pt: a.name || '' };
      }

      return {
        optionId: a.optionId,
        name: finalAddonNameObj, // অবজেক্ট আকারে অ্যাসাইন হলো
        sku: a.sku,
        originalPrice: a.originalPrice,
        promoDiscountAmount: 0,
        unitPrice: a.unitPrice,
        quantity: a.quantity,
        lineTotal: addonLineNet,
        taxRate: a.taxRate || 0,
        taxAmount: roundTo2(addonLineNet * (aTaxRate / 100)),
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

    const productLineNet = roundTo2(priceAfterStoreDiscount * qty);
    const productTaxRate = product.pricing?.taxRate || 0;
    const productTaxAmount = roundTo2(productLineNet * (productTaxRate / 100));

    const itemTotalBeforeTax = roundTo2(productLineNet + totalAddonsLineTotal);
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
      name: finalItemNameObj, // অবজেক্ট হিসেবে ডেটাবেজে যাবে
      image: product.images?.[0] || '',
      hasVariations: product?.stock?.hasVariations || false,
      variationSku: item.variationSku || null,
      addons: processedAddons,
      productPricing: {
        originalPrice: basePrice,
        productDiscountAmount: storeDiscountUnit,
        priceAfterProductDiscount: priceAfterStoreDiscount,
        promoDiscountAmount: 0,
        unitPrice: priceAfterStoreDiscount,
        lineTotal: productLineNet,
        taxRate: productTaxRate,
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
    (sum: number, i: any) =>
      sum + i.productPricing.originalPrice * i.itemSummary.quantity,
    0,
  );
  const totalProductDiscount = orderItems.reduce(
    (sum: number, i: any) => sum + i.itemSummary.totalProductDiscount,
    0,
  );
  const taxableAmount = orderItems.reduce(
    (sum: number, i: any) => sum + i.itemSummary.totalBeforeTax,
    0,
  );
  const totalTaxAmount = roundTo2(
    orderItems.reduce(
      (sum: number, i: any) => sum + i.itemSummary.totalTaxAmount,
      0,
    ),
  );

  const totalCommAmt = orderItems.reduce(
    (sum: number, i: any) => sum + i.commission.deliGoCommissionAmount,
    0,
  );
  const totalCommVat = orderItems.reduce(
    (sum: number, i: any) => sum + i.commission.deliGoCommissionVatAmount,
    0,
  );

  const fleetFee = roundTo2(
    deliveryChargeBase *
      ((globalSettings?.fleetManagerCommissionPercent || 0) / 100),
  );

  const vendorNetPayout = roundTo2(
    taxableAmount + totalTaxAmount - (totalCommAmt + totalCommVat),
  );
  const vendorEarningsWithoutTax = roundTo2(vendorNetPayout - totalTaxAmount);

  const riderNetEarnings = roundTo2(totalDeliveryCharge - fleetFee);
  const riderEarningsWithoutTax = roundTo2(riderNetEarnings - deliveryVat);

  const finalGrandTotal = roundTo2(
    taxableAmount + totalTaxAmount + totalDeliveryCharge + serviceCharge,
  );

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
      serviceCharge: roundTo2(serviceCharge),
    },
    delivery: {
      charge: deliveryChargeBase,
      vatRate: globalSettings?.deliveryVatRate || 0,
      vatAmount: roundTo2(deliveryGrossRaw - deliveryChargeBase),
      totalDeliveryCharge: roundTo2(deliveryGrossRaw),
      distance: roundTo2(distanceData.km),
      estimatedTime: distanceData.durationMinutes,
    },
    payoutSummary: {
      grandTotal: finalGrandTotal,
      deliGoCommission: {
        rate: PLATFORM_COMMISSION_RATE,
        amount: roundTo2(totalCommAmt),
        vatAmount: roundTo2(totalCommVat),
        totalDeduction: roundTo2(totalCommAmt + totalCommVat),
        earnedServiceCharge: roundTo2(serviceCharge),
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

  const summary = await CheckoutSummary.create(finalSummaryData);
  return {
    messageKey: 'CHECKOUT_SUCCESS' as const,
    data: summary,
  };
};

// get checkout summary
const getCheckoutSummary = async (
  checkoutSummaryId: string,
  currentUser: TCurrentUser,
) => {
  if (currentUser.status !== 'APPROVED') {
    throw new AppError(httpStatus.FORBIDDEN, 'ORDER_VIEW_APPROVAL_REQUIRED', {
      status: currentUser.status,
    });
  }
  const summary = await CheckoutSummary.findById(checkoutSummaryId);

  if (!summary) {
    throw new AppError(httpStatus.NOT_FOUND, 'CHECKOUT_SUMMARY_NOT_FOUND');
  }

  if (summary.customerId.toString() !== currentUser._id.toString()) {
    throw new AppError(httpStatus.UNAUTHORIZED, 'UNAUTHORIZED_TO_VIEW');
  }

  if (summary.isConvertedToOrder) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'CHECKOUT_SUMMARY_ALREADY_CONVERTED',
    );
  }

  return {
    messageKey: 'CHECKOUT_SUMMARY_RETRIEVED_SUCCESS' as const,
    data: summary,
  };
};

export const CheckoutServices = {
  checkout,
  getCheckoutSummary,
};
