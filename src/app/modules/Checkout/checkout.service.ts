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

  // Checkout can be created either from the saved cart or from a single
  // direct-purchase item sent in the request payload.
  if (payload.useCart) {
    const dataKey = `cart:data:${customerId}`;
    let cart = await RedisService.get<any>(dataKey);

    // Fall back to MongoDB when the cart is not present in Redis.
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

  // Load all referenced products once so item-level calculations can reuse
  // the same product snapshots.
  const productIds = selectedItems.map((i: any) => i.productId.toString());
  const products = await Product.find({ _id: { $in: productIds } }).lean();
  if (products.length === 0)
    throw new AppError(httpStatus.NOT_FOUND, 'PRODUCTS_NOT_FOUND');

  // Checkout is limited to one vendor because delivery, payout, and summary
  // calculations are built around a single store.
  const vendorId = products[0].vendorId;
  const existingVendor = await Vendor.findById(vendorId).lean();
  if (!existingVendor || !existingVendor.businessDetails?.isStoreOpen) {
    throw new AppError(httpStatus.BAD_REQUEST, 'VENDOR_CLOSED');
  }

  // The active delivery address is used both for validation and for road
  // distance calculation against the vendor location.
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

  // Google road distance is used instead of straight-line distance so the
  // delivery charge and ETA reflect actual travel.
  const distanceData = await calculateGoogleRoadDistance(
    longitude,
    latitude,
    activeAddress.longitude || 0,
    activeAddress.latitude || 0,
  );

  const globalSettings = await GlobalSettingsService.getGlobalSettings();
  const deliveryVatRate =
    globalSettings?.deliveryVatRate === 0
      ? 23
      : (globalSettings?.deliveryVatRate ?? 23);
  const serviceCharge = globalSettings?.serviceCharge || 0;

  const BASE_FIXED_DELIVERY_CHARGE = globalSettings?.baseDeliveryCharge || 0;

  // Deliveries within 1 km use the fixed base charge. Longer trips use the
  // configured per-kilometer rate.
  const deliveryChargeBase =
    distanceData.meters <= 1000
      ? BASE_FIXED_DELIVERY_CHARGE || 0
      : roundTo2(distanceData.km * (globalSettings?.deliveryChargePerKm || 0));

  const deliveryVat = roundTo2((deliveryChargeBase * deliveryVatRate) / 100);
  const totalDeliveryCharge = roundTo2(deliveryChargeBase + deliveryVat);

  const PLATFORM_COMMISSION_RATE =
    globalSettings?.platformCommissionPercent || 0;
  const COMMISSION_VAT_RATE = globalSettings?.platformCommissionVatRate || 0;

  // Convert each selected item into the normalized checkout snapshot that will
  // later be reused by order creation.
  const orderItems = selectedItems.map((item: any) => {
    const product = products.find(
      (p) => p._id.toString() === item.productId.toString(),
    );
    if (!product) throw new AppError(httpStatus.NOT_FOUND, 'PRODUCT_NOT_FOUND');

    let basePrice = product.pricing?.price || 0;
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

    // When a variation SKU is selected, its price overrides the base product
    // price and its label is appended for direct checkout names.
    if (item.variationSku && product.variations?.length) {
      const selectedOption = product.variations
        .flatMap((v: any) => v.options || [])
        .find((opt: any) => opt.sku === item.variationSku);

      if (selectedOption) {
        basePrice = selectedOption.price;

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

    const discount = product.pricing?.discount || 0;
    const discountType = product.pricing?.discountType || 'PERCENTAGE';

    // Store discount is calculated per unit first, then multiplied by quantity
    // inside the summary totals.
    let storeDiscountUnit = 0;
    if (discountType.toUpperCase() === 'FLAT') {
      storeDiscountUnit = roundTo2(discount);
    } else {
      storeDiscountUnit = roundTo2((basePrice * discount) / 100);
    }

    const priceAfterStoreDiscount = roundTo2(basePrice - storeDiscountUnit);

    // Add-ons already carry their own price, quantity, and tax metadata in the
    // cart/request payload, so this step only normalizes totals and names.
    const processedAddons = (item.addons || []).map((a: any) => {
      const aPrice = Number(a.unitPrice) || 0;
      const aQty = Number(a.quantity) || 0;
      const aTaxRate = Number(a.taxRate) || 0;

      const addonLineTotal = roundTo2(aPrice * aQty);
      const addonTaxAmount = roundTo2(
        (addonLineTotal * aTaxRate) / (100 + aTaxRate),
      );

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
        name: finalAddonNameObj,
        sku: a.sku,
        originalPrice: a.originalPrice,
        promoDiscountAmount: 0,
        unitPrice: a.unitPrice,
        quantity: a.quantity,
        lineTotal: addonLineTotal,
        taxRate: aTaxRate,
        taxAmount: addonTaxAmount,
      };
    });

    // Item grand total combines the discounted product total with all add-ons.
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

    const productTaxAmount = roundTo2(
      (productLineTotal * productTaxRate) / (100 + productTaxRate),
    );

    const itemGrandTotal = roundTo2(productLineTotal + totalAddonsLineTotal);
    const itemTotalTax = roundTo2(productTaxAmount + totalAddonsTax);

    // DeliGo Commission calculated from Net Price (Original Price minus Discount minus Tax)
    const priceWithoutTax = roundTo2(itemGrandTotal - itemTotalTax);
    const commAmt = roundTo2(
      priceWithoutTax * (PLATFORM_COMMISSION_RATE / 100),
    );
    const commVat = roundTo2(commAmt * (COMMISSION_VAT_RATE / 100));

    const totalVendorDeduction = roundTo2(commAmt + commVat);
    const vendorNetEarnings = roundTo2(itemGrandTotal - totalVendorDeduction);
    const vendorEarningsWithoutTax = roundTo2(vendorNetEarnings - itemTotalTax);

    return {
      productId: product._id,
      vendorId: product.vendorId,
      name: finalItemNameObj,
      image: product.images?.[0] || '',
      hasVariations: product?.stock?.hasVariations || false,
      variationSku: item.variationSku || null,
      addons: processedAddons,
      productPricing: {
        originalPrice: basePrice,
        productDiscountAmount: storeDiscountUnit,
        discountType: discountType.toUpperCase(),
        priceAfterProductDiscount: priceAfterStoreDiscount,
        promoDiscountAmount: 0,
        unitPrice: priceAfterStoreDiscount,
        lineTotal: productLineTotal,
        taxRate: productTaxRate,
        taxAmount: productTaxAmount,
      },
      itemSummary: {
        quantity: qty,
        totalTaxAmount: itemTotalTax,
        totalPromoDiscount: 0,
        totalProductDiscount: roundTo2(storeDiscountUnit * qty),
        grandTotal: itemGrandTotal,
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

  const totalOriginalPrice = orderItems.reduce((sum: number, i: any) => {
    const productOriginalTotal =
      i.productPricing.originalPrice * i.itemSummary.quantity;
    const addonsOriginalTotal = i.addons.reduce(
      (aSum: number, a: any) => aSum + a.originalPrice * a.quantity,
      0,
    );
    return sum + productOriginalTotal + addonsOriginalTotal;
  }, 0);

  const totalProductDiscount = orderItems.reduce(
    (sum: number, i: any) => sum + i.itemSummary.totalProductDiscount,
    0,
  );

  const totalItemsSubTotal = orderItems.reduce(
    (sum: number, i: any) => sum + i.itemSummary.grandTotal,
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
    totalItemsSubTotal - (totalCommAmt + totalCommVat),
  );
  const vendorEarningsWithoutTax = roundTo2(vendorNetPayout - totalTaxAmount);

  const riderNetEarnings = roundTo2(deliveryChargeBase - fleetFee);

  const finalGrandTotal = roundTo2(
    totalItemsSubTotal + totalDeliveryCharge + serviceCharge,
  );

  // This document is a pre-order snapshot. Existing unfinished summaries for
  // the same customer and vendor are replaced so only the latest one remains.
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
      totalTaxAmount: roundTo2(totalTaxAmount),
      itemsSubtotal: roundTo2(totalItemsSubTotal),
      serviceCharge: roundTo2(serviceCharge),
    },
    delivery: {
      charge: deliveryChargeBase,
      vatRate: deliveryVatRate,
      vatAmount: deliveryVat,
      totalDeliveryCharge: totalDeliveryCharge,
      distance: roundTo2(distanceData.km),
      estimatedTime: distanceData.durationMinutes,
    },
    payoutSummary: {
      grandTotal: finalGrandTotal,
      deliGoCommission: {
        rate: PLATFORM_COMMISSION_RATE,
        amount: roundTo2(totalCommAmt),
        vatAmount: roundTo2(totalCommVat),
        totalDeduction: roundTo2(totalCommAmt + totalCommVat), // eta thik korte hobe , wallet adjust korte hobe?
        earnedServiceCharge: roundTo2(serviceCharge),
        deliveryVatAmount: roundTo2(deliveryVat),
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
    messageKey: 'CHECKOUT_SUCCESS',
    data: summary,
  };
};
// get checkout summary
const getCheckoutSummary = async (
  checkoutSummaryId: string,
  currentUser: TCurrentUser,
) => {
  // Only approved users can view a pending checkout summary before it is
  // converted into an order.
  if (currentUser.status !== 'APPROVED') {
    throw new AppError(httpStatus.FORBIDDEN, 'ORDER_VIEW_APPROVAL_REQUIRED', {
      status: currentUser.status,
    });
  }
  const summary = await CheckoutSummary.findById(checkoutSummaryId).lean();

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
    messageKey: 'DATA_LOAD_SUCCESS',
    variables: { entity: 'Checkout Summary' },
    data: summary,
  };
};

export const CheckoutServices = {
  checkout,
  getCheckoutSummary,
};
