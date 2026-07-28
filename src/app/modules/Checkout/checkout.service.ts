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
  let selectedItems: any[] = [];

  // 1. Cart Fetching and Validation
  if (payload.useCart) {
    const dataKey = `cart:data:${customerId}`;
    let cart = await RedisService.get<any>(dataKey);

    if (!cart) {
      cart = await Cart.findOne({ customerId, isDeleted: false }).lean();
    }

    if (!cart || !cart.items || cart.items.length === 0) {
      throw new AppError(httpStatus.BAD_REQUEST, 'CART_EMPTY');
    }

    selectedItems = cart.items.filter((i: any) => i.isActive === true);
    if (selectedItems.length === 0) {
      throw new AppError(httpStatus.BAD_REQUEST, 'NO_ACTIVE_CART_ITEMS');
    }
  } else {
    if (!payload.items || payload.items.length !== 1) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'DIRECT_CHECKOUT_SINGLE_ITEM_ONLY',
      );
    }
    selectedItems = payload.items;
  }

  // 2. Fetch and Validate Products
  const productIds = selectedItems.map((i: any) => i.productId.toString());
  const products = await Product.find({ _id: { $in: productIds } }).lean();
  if (products.length === 0) {
    throw new AppError(httpStatus.NOT_FOUND, 'PRODUCTS_NOT_FOUND');
  }

  const vendorId = products[0].vendorId;
  const existingVendor = await Vendor.findById(vendorId).lean();
  if (!existingVendor || !existingVendor.businessDetails?.isStoreOpen) {
    throw new AppError(httpStatus.BAD_REQUEST, 'VENDOR_CLOSED');
  }

  // 3. Address & Spatial Logistics
  const activeAddress = currentUser?.deliveryAddresses?.find(
    (i: any) => i.isActive === true,
  );

  if (
    !activeAddress ||
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

  const distanceData = await calculateGoogleRoadDistance(
    vendorLocation.longitude,
    vendorLocation.latitude,
    activeAddress.longitude,
    activeAddress.latitude,
  );

  const distanceMeters = Number(distanceData.meters) || 0;
  const distanceKm = Number(distanceData.km) || 0;

  // 4. Configuration & Global Rates
  const globalSettings = await GlobalSettingsService.getGlobalSettings();

  const deliveryVatRate =
    globalSettings?.deliveryVatRate === 0
      ? 23
      : (globalSettings?.deliveryVatRate ?? 23);
  const serviceCharge = globalSettings?.serviceCharge || 0;
  const serviceChargeVatRate = 23; // Strict Platform Rules for Portugal IVA
  const serviceChargeVatAmount = roundTo2(
    (serviceCharge * serviceChargeVatRate) / 100,
  );

  const BASE_FIXED_DELIVERY_CHARGE = globalSettings?.baseDeliveryCharge || 0;

  const PER_KM_RATE = globalSettings?.deliveryChargePerKm || 0;

  let deliveryChargeBase = 0;

  if (distanceMeters <= 1000) {
    deliveryChargeBase = BASE_FIXED_DELIVERY_CHARGE;
  } else {
    const extraKm = distanceKm - 1;
    const extraDistanceCharge = extraKm * PER_KM_RATE;
    deliveryChargeBase = roundTo2(
      BASE_FIXED_DELIVERY_CHARGE + extraDistanceCharge,
    );
  }

  const deliveryVat = roundTo2((deliveryChargeBase * deliveryVatRate) / 100);
  const totalDeliveryCharge = roundTo2(deliveryChargeBase + deliveryVat);

  const PLATFORM_COMMISSION_RATE =
    globalSettings?.platformCommissionPercent || 0;
  const COMMISSION_VAT_RATE = globalSettings?.platformCommissionVatRate || 0;

  // 5. Line Item Transformation Core Engine
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

    if (item.variationSku && product.variations?.length) {
      const selectedOption = product.variations
        .flatMap((v: any) => v.options || [])
        .find((opt: any) => opt.sku === item.variationSku);

      if (!selectedOption) {
        throw new AppError(httpStatus.BAD_REQUEST, 'VARIATION_NOT_FOUND');
      }

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
    } else if (
      !payload.useCart &&
      (product.stock?.hasVariations || product.variations?.length)
    ) {
      throw new AppError(httpStatus.BAD_REQUEST, 'VARIATION_SKU_REQUIRED');
    }

    const qty = item.itemSummary?.quantity || item.quantity || 1;
    const discount = product.pricing?.discount || 0;
    const discountType = product.pricing?.discountType || 'PERCENTAGE';

    let storeDiscountUnit = 0;
    if (discountType.toUpperCase() === 'FLAT') {
      storeDiscountUnit = roundTo2(discount);
    } else {
      storeDiscountUnit = roundTo2((basePrice * discount) / 100);
    }

    const priceAfterStoreDiscount = roundTo2(basePrice - storeDiscountUnit);

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

    const priceWithoutTax = roundTo2(itemGrandTotal - itemTotalTax);
    const commAmt = roundTo2(
      priceWithoutTax * (PLATFORM_COMMISSION_RATE / 100),
    );
    const commVat = roundTo2(commAmt * (COMMISSION_VAT_RATE / 100));

    const totalVendorDeduction = roundTo2(commAmt + commVat);
    const vendorNetEarnings = roundTo2(itemGrandTotal - totalVendorDeduction);

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
        vendorEarningsWithoutTax: roundTo2(vendorNetEarnings - itemTotalTax),
        payableTax: itemTotalTax,
        vendorNetEarnings,
      },
    };
  });

  // 6. Global Mathematical Accumulation
  const rawOriginalPrice = orderItems.reduce((sum: number, i: any) => {
    const productOriginalTotal =
      i.productPricing.originalPrice * i.itemSummary.quantity;
    const addonsOriginalTotal = i.addons.reduce(
      (aSum: number, a: any) => aSum + a.originalPrice * a.quantity,
      0,
    );
    return sum + productOriginalTotal + addonsOriginalTotal;
  }, 0);
  const totalOriginalPrice = roundTo2(rawOriginalPrice);

  const totalProductDiscount = roundTo2(
    orderItems.reduce(
      (sum: number, i: any) => sum + i.itemSummary.totalProductDiscount,
      0,
    ),
  );
  const totalItemsSubTotal = roundTo2(
    orderItems.reduce(
      (sum: number, i: any) => sum + i.itemSummary.grandTotal,
      0,
    ),
  );
  const totalTaxAmount = roundTo2(
    orderItems.reduce(
      (sum: number, i: any) => sum + i.itemSummary.totalTaxAmount,
      0,
    ),
  );

  const totalCommAmt = roundTo2(
    orderItems.reduce(
      (sum: number, i: any) => sum + i.commission.deliGoCommissionAmount,
      0,
    ),
  );
  const totalCommVat = roundTo2(
    orderItems.reduce(
      (sum: number, i: any) => sum + i.commission.deliGoCommissionVatAmount,
      0,
    ),
  );

  const fleetFee = roundTo2(
    deliveryChargeBase *
      ((globalSettings?.fleetManagerCommissionPercent || 0) / 100),
  );

  const vendorNetPayout = roundTo2(
    totalItemsSubTotal - (totalCommAmt + totalCommVat),
  );
  const riderNetEarnings = roundTo2(deliveryChargeBase - fleetFee);

  const finalGrandTotal = roundTo2(
    totalItemsSubTotal +
      totalDeliveryCharge +
      serviceCharge +
      serviceChargeVatAmount,
  );

  // 7. Core Treasury Financial Ledgers Alignment (DeliGo Platform Tax Isolation)
  const totalPlatformNetRevenue = roundTo2(totalCommAmt + serviceCharge);
  const totalPlatformPayableTax = roundTo2(
    totalCommVat + serviceChargeVatAmount + deliveryVat,
  );
  const totalPlatformGrossHolding = roundTo2(
    totalPlatformNetRevenue + totalPlatformPayableTax,
  );
  const totalDeduction = roundTo2(totalCommAmt + totalCommVat);

  const finalSummaryData = {
    customerId,
    vendorId,
    customerEmail: currentUser?.email || '',
    contactNumber: currentUser?.contactNumber || '',
    items: orderItems,
    totalItems: orderItems.length,
    totalQuantity: orderItems.reduce(
      (s: number, i: any) => s + i.itemSummary.quantity,
      0,
    ),

    orderCalculation: {
      totalOriginalPrice,
      totalProductDiscount,
      totalOfferDiscount: 0,
      totalTaxAmount,
      itemsSubtotal: totalItemsSubTotal,
      serviceCharge: roundTo2(serviceCharge),
      serviceChargeVatRate,
      serviceChargeVatAmount,
    },
    delivery: {
      charge: deliveryChargeBase,
      vatRate: deliveryVatRate,
      vatAmount: deliveryVat,
      totalDeliveryCharge,
      distance: roundTo2(distanceKm),
      estimatedTime: Number(distanceData.durationMinutes) || 0,
    },
    payoutSummary: {
      grandTotal: finalGrandTotal,
      deliGoCommission: {
        rate: PLATFORM_COMMISSION_RATE,
        amount: totalCommAmt,
        vatAmount: totalCommVat,
        totalDeduction,
        earnedServiceCharge: roundTo2(serviceCharge),
        serviceChargeVatAmount,
        deliveryVatAmount: deliveryVat,
        totalPlatformNetRevenue,
        totalPlatformPayableTax,
        totalPlatformGrossHolding,
      },
      fleet: {
        rate: globalSettings?.fleetManagerCommissionPercent || 0,
        fee: fleetFee,
      },
      vendor: {
        earningsWithoutTax: roundTo2(
          totalItemsSubTotal - totalDeduction - totalTaxAmount,
        ),
        payableTax: totalTaxAmount,
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

  // 8. Atomic database updates
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
