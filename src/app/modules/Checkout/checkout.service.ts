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
import { roundTo4 } from '../../utils/mathProvider';

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

  const deliveryChargeBase = roundTo4(
    distance.meters * (globalSettings?.deliveryChargePerMeter || 0),
  );
  const deliveryVat = roundTo4(
    deliveryChargeBase * ((globalSettings?.deliveryVatRate || 0) / 100),
  );
  const totalDeliveryCharge = roundTo4(deliveryChargeBase + deliveryVat);

  const PLATFORM_COMMISSION_RATE =
    globalSettings?.platformCommissionPercent || 0;
  const COMMISSION_VAT_RATE = globalSettings?.platformCommissionVatRate || 0;

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
      if (selectedOption) basePrice = selectedOption.price;
    }

    const qty = item.quantity || 1;
    const storeDiscountUnit = roundTo4(
      basePrice * ((product.pricing?.discount || 0) / 100),
    );
    const priceAfterStoreDiscount = roundTo4(basePrice - storeDiscountUnit);

    const processedAddons = (item.addons || []).map((a: any) => {
      const addonLineTotal = roundTo4(a.price * a.quantity);
      const addonTax = roundTo4(addonLineTotal * ((a.taxRate || 0) / 100));
      return {
        optionId: a.optionId,
        name: a.name,
        sku: a.sku,
        originalPrice: a.price,
        promoDiscountAmount: 0,
        unitPrice: a.price,
        quantity: a.quantity,
        lineTotal: addonLineTotal,
        taxRate: a.taxRate || 0,
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

    const productLineTotal = roundTo4(priceAfterStoreDiscount * qty);
    const productTaxAmount = roundTo4(
      productLineTotal * ((product.pricing?.taxRate || 0) / 100),
    );

    const itemTotalBeforeTax = roundTo4(
      productLineTotal + totalAddonsLineTotal,
    );
    const itemTotalTax = roundTo4(productTaxAmount + totalAddonsTax);

    const commAmt = roundTo4(
      itemTotalBeforeTax * (PLATFORM_COMMISSION_RATE / 100),
    );
    const commVat = roundTo4(commAmt * (COMMISSION_VAT_RATE / 100));

    return {
      productId: product._id,
      vendorId: product.vendorId,
      name: product.name,
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
        taxAmount: productTaxAmount,
      },
      itemSummary: {
        quantity: qty,
        totalBeforeTax: itemTotalBeforeTax,
        totalTaxAmount: itemTotalTax,
        totalPromoDiscount: 0,
        totalProductDiscount: roundTo4(storeDiscountUnit * qty),
        grandTotal: roundTo4(itemTotalBeforeTax + itemTotalTax),
      },
      commission: {
        deliGoCommissionRate: PLATFORM_COMMISSION_RATE,
        deliGoCommissionAmount: commAmt,
        deliGoCommissionVatRate: COMMISSION_VAT_RATE,
        deliGoCommissionVatAmount: commVat,
      },
      vendorNetEarnings: roundTo4(
        itemTotalBeforeTax + itemTotalTax - (commAmt + commVat),
      ),
    };
  });

  // ৬. এগ্রিগেটেড সামারি তৈরি (Final TCheckoutSummary structure)
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

  const fleetFee = roundTo4(
    deliveryChargeBase *
      ((globalSettings?.fleetManagerCommissionPercent || 0) / 100),
  );
  const grandTotal = roundTo4(
    taxableAmount + totalTaxAmount + totalDeliveryCharge,
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
      totalOriginalPrice: roundTo4(totalOriginalPrice),
      totalProductDiscount: roundTo4(totalProductDiscount),
      totalOfferDiscount: 0,
      taxableAmount: roundTo4(taxableAmount),
      totalTaxAmount: roundTo4(totalTaxAmount),
    },

    delivery: {
      charge: deliveryChargeBase,
      vatRate: globalSettings?.deliveryVatRate || 0,
      vatAmount: deliveryVat,
      totalDeliveryCharge: totalDeliveryCharge,
      distance: roundTo4(distance.km),
      estimatedTime: payload.estimatedDeliveryTime || '20-30 minutes',
    },

    payoutSummary: {
      grandTotal,
      deliGoCommission: {
        rate: PLATFORM_COMMISSION_RATE,
        amount: roundTo4(totalCommAmt),
        vatAmount: roundTo4(totalCommVat),
        totalDeduction: roundTo4(totalCommAmt + totalCommVat),
      },
      fleet: {
        rate: globalSettings?.fleetManagerCommissionPercent || 0,
        fee: fleetFee,
      },
      vendorNetPayout: roundTo4(
        taxableAmount + totalTaxAmount - (totalCommAmt + totalCommVat),
      ),
      riderNetEarnings: roundTo4(totalDeliveryCharge - fleetFee),
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

// const checkout = async (currentUser: any, payload: TCheckoutPayload) => {
//   const requiredFields = [
//     { field: currentUser.name?.firstName, label: 'First Name' },
//     { field: currentUser.contactNumber, label: 'Contact Number' },
//     { field: currentUser.address?.city, label: 'City' },
//     // { field: currentUser.address?.street, label: 'Street' },
//   ];

//   for (const item of requiredFields) {
//     if (!item.field)
//       throw new AppError(httpStatus.BAD_REQUEST, `${item.label} is required.`);
//   }

//   const customerId = currentUser._id.toString();
//   let selectedItems = [];
//   const cart = await Cart.findOne({ customerId, isDeleted: false });

//   if (payload.useCart) {
//     if (!cart || cart.items.length === 0)
//       throw new AppError(httpStatus.BAD_REQUEST, 'Cart is empty');
//     selectedItems = cart.items.filter((i: any) => i.isActive === true);
//     if (selectedItems.length === 0)
//       throw new AppError(httpStatus.BAD_REQUEST, 'No active items in cart');
//   } else {
//     if (!payload.items || payload.items.length !== 1)
//       throw new AppError(
//         httpStatus.BAD_REQUEST,
//         'Direct checkout supports 1 item',
//       );
//     selectedItems = payload.items;
//   }

//   const productIds = selectedItems.map((i: any) => i.productId.toString());
//   const products = await Product.find({ _id: { $in: productIds } });
//   if (products.length === 0)
//     throw new AppError(httpStatus.NOT_FOUND, 'Products not found');

//   const vendorId = products[0].vendorId;
//   const existingVendor = await Vendor.findById(vendorId);
//   if (!existingVendor || !existingVendor.businessDetails?.isStoreOpen) {
//     throw new AppError(httpStatus.BAD_REQUEST, 'Vendor is closed');
//   }

//   const activeAddress = currentUser?.deliveryAddresses?.find(
//     (i: any) => i.isActive === true,
//   );
//   const vendorCoords = existingVendor.currentSessionLocation?.coordinates;

//   if (!activeAddress || !vendorCoords || vendorCoords.length < 2) {
//     throw new AppError(httpStatus.BAD_REQUEST, 'Location data missing');
//   }

//   const distance = calculateDistance(
//     vendorCoords[0],
//     vendorCoords[1],
//     activeAddress.longitude,
//     activeAddress.latitude,
//   );
//   const distanceInKM = roundTo4(distance.km) || 0;
//   const globalSettingsData = await GlobalSettingsService.getGlobalSettings();
//   const deliveryChargeNet =
//     roundTo4(
//       distance.meters * (globalSettingsData?.deliveryChargePerMeter || 0),
//     ) || 0;
//   const deliveryVatAmount =
//     roundTo4(
//       deliveryChargeNet * ((globalSettingsData?.deliveryVatRate || 0) / 100),
//     ) || 0;

//   let totalFoodVatAccumulator = 0;
//   let totalNetFoodPriceAccumulator = 0;
//   let totalDeliGoCommission = 0;
//   let totalCommissionVat = 0;
//   let totalProductDiscountAccumulator = 0;

//   const PLATFORM_COMMISSION_RATE =
//     globalSettingsData?.platformCommissionPercent;
//   const COMMISSION_VAT_RATE = globalSettingsData?.platformCommissionVatRate;

//   const orderItems = selectedItems.map((item: any) => {
//     const product = products.find(
//       (p) => p._id.toString() === item.productId.toString(),
//     );
//     if (!product) throw new AppError(httpStatus.NOT_FOUND, 'Product not found');

//     let basePrice = product.pricing?.price || 0;
//     if (item.variationSku && product.variations?.length) {
//       const selectedOption = product.variations
//         .flatMap((v: any) => v.options || [])
//         .find((opt: any) => opt.sku === item.variationSku);
//       if (selectedOption) basePrice = selectedOption.price || basePrice;
//     }

//     const discountPercent = product.pricing?.discount || 0;
//     const discountAmountPerUnit =
//       roundTo4(basePrice * (discountPercent / 100)) || 0;
//     const unitPriceAfterDiscount = basePrice - discountAmountPerUnit;
//     const quantity = item.quantity || 1;

//     const itemTotalProductDiscount = roundTo4(discountAmountPerUnit * quantity);

//     totalProductDiscountAccumulator += itemTotalProductDiscount;

//     const productTotalBeforeTax =
//       roundTo4(unitPriceAfterDiscount * quantity) || 0;
//     const taxRate = product.pricing?.taxRate || 13;
//     const productTaxAmount =
//       roundTo4(productTotalBeforeTax * (taxRate / 100)) || 0;

//     const processedAddons = (item.addons || []).map((a: any) => {
//       const addonOriginalPrice = a.price || 0;
//       const addonQty = a.quantity || 0;
//       const addonPromoDiscount = 0;
//       const addonNetPrice = addonOriginalPrice - addonPromoDiscount;
//       const addonTaxRate = a.taxRate || 23;
//       const addonTax =
//         roundTo4(addonNetPrice * addonQty * (addonTaxRate / 100)) || 0;
//       return {
//         optionId: a.optionId,
//         name: a.name,
//         sku: a.sku,
//         originalPrice: addonOriginalPrice,
//         promoDiscountAmount: addonPromoDiscount,
//         price: addonNetPrice,
//         quantity: addonQty,
//         taxRate: addonTaxRate,
//         taxAmount: addonTax,
//       };
//     });

//     const addonsTotalNet =
//       processedAddons.reduce(
//         (sum: number, a: any) => sum + a.price * a.quantity,
//         0,
//       ) || 0;
//     const addonsTotalTax =
//       processedAddons.reduce(
//         (sum: number, a: any) => sum + (a.taxAmount || 0),
//         0,
//       ) || 0;

//     const itemTotalBeforeTax =
//       roundTo4(productTotalBeforeTax + addonsTotalNet) || 0;
//     const itemTaxAmount = roundTo4(productTaxAmount + addonsTotalTax) || 0;
//     const itemSubtotal = roundTo4(itemTotalBeforeTax + itemTaxAmount) || 0;

//     const itemCommissionNet =
//       roundTo4(itemTotalBeforeTax * (PLATFORM_COMMISSION_RATE / 100)) || 0;
//     const itemCommissionVat =
//       roundTo4(itemCommissionNet * (COMMISSION_VAT_RATE / 100)) || 0;
//     const itemVendorEarnings =
//       roundTo4(itemSubtotal - (itemCommissionNet + itemCommissionVat)) || 0;

//     totalFoodVatAccumulator += itemTaxAmount;
//     totalNetFoodPriceAccumulator += itemTotalBeforeTax;
//     totalDeliGoCommission += itemCommissionNet;
//     totalCommissionVat += itemCommissionVat;

//     return {
//       productId: product._id,
//       vendorId: product.vendorId,
//       name:
//         item.variationSku && product.variations
//           ? `${product.name} - ${product.variations.flatMap((v) => v.options).find((o) => o.sku === item.variationSku)?.label || ''}`
//           : product.name,
//       image: product.images?.[0] || '',
//       hasVariations: product.stock?.hasVariations || false,
//       variationSku: item.variationSku || null,
//       quantity,
//       originalPrice: basePrice,
//       productDiscountAmount: discountAmountPerUnit,
//       promoDiscountAmount: 0,
//       totalDiscountAmount: discountAmountPerUnit,
//       price: unitPriceAfterDiscount,
//       addons: processedAddons,
//       productTotalBeforeTax,
//       productTaxAmount: roundTo4(productTaxAmount),
//       totalBeforeTax: itemTotalBeforeTax,
//       taxRate,
//       taxAmount: itemTaxAmount,
//       subtotal: itemSubtotal,
//       commissionRate: PLATFORM_COMMISSION_RATE,
//       commissionAmount: itemCommissionNet,
//       commissionVatRate: COMMISSION_VAT_RATE,
//       commissionVatAmount: itemCommissionVat,
//       vendorNetEarnings: itemVendorEarnings,
//     };
//   });

//   const totalDeliveryGross = deliveryChargeNet + deliveryVatAmount;
//   const taxableAmount = roundTo4(totalNetFoodPriceAccumulator) || 0;

//   // const totalPriceGross = roundTo4(totalNetFoodPriceAccumulator) || 0;
//   const totalPriceGross = roundTo4(
//     taxableAmount + totalProductDiscountAccumulator,
//   );
//   const totalTaxAmount = roundTo4(totalFoodVatAccumulator) || 0;

//   const fleetManagerCommissionPercent = roundTo4(
//     globalSettingsData.fleetManagerCommissionPercent! / 100,
//   );

//   const fleetFee =
//     roundTo4(deliveryChargeNet * fleetManagerCommissionPercent) || 0;

//   const riderNetEarnings = roundTo4(totalDeliveryGross - fleetFee);

//   const summaryData = {
//     customerId,
//     vendorId,
//     customerEmail: currentUser?.email || '',
//     contactNumber: currentUser?.contactNumber || '',
//     items: orderItems,
//     totalItems:
//       orderItems.reduce((s: number, i: any) => s + i.quantity, 0) || 0,

//     totalPrice: totalPriceGross,
//     totalProductDiscount: roundTo4(totalProductDiscountAccumulator),
//     totalOfferDiscount: 0,

//     taxableAmount,
//     taxAmount: totalTaxAmount,

//     deliveryCharge: deliveryChargeNet,
//     deliveryVatRate: globalSettingsData?.deliveryVatRate,
//     deliveryVatAmount,
//     totalDeliveryCharge: totalDeliveryGross,

//     deliGoCommissionRate: PLATFORM_COMMISSION_RATE,
//     deliGoCommission: roundTo4(totalDeliGoCommission) || 0,
//     commissionVat: roundTo4(totalCommissionVat) || 0,
//     deliGoCommissionNet: roundTo4(totalDeliGoCommission + totalCommissionVat),
//     totalVendorDeduction: roundTo4(totalDeliGoCommission + totalCommissionVat),

//     vendorNetPayout: roundTo4(
//       taxableAmount +
//         totalTaxAmount -
//         (totalDeliGoCommission + totalCommissionVat),
//     ),

//     fleetCommissionRate: globalSettingsData.fleetManagerCommissionPercent,
//     fleetFee,
//     riderNetEarnings: riderNetEarnings || 0,
//     subtotal:
//       roundTo4(taxableAmount + totalTaxAmount + totalDeliveryGross) || 0,
//     offerApplied: null,
//     deliveryAddress: activeAddress,
//     deliveryDistance: distanceInKM,
//     estimatedDeliveryTime: payload.estimatedDeliveryTime || '20-30 minutes',
//     isConvertedToOrder: false,
//   };

//   await CheckoutSummary.deleteMany({
//     customerId,
//     vendorId,
//     isConvertedToOrder: false,
//   });
//   return await CheckoutSummary.create(summaryData);
// };

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
