/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import httpStatus from 'http-status';
import AppError from '../../errors/AppError';
import { Order } from '../Order/order.model';
import { roundTo2 } from '../../utils/mathProvider';
import { Offer } from './offer.model';
import mongoose from 'mongoose';
import { GlobalSettingsService } from '../GlobalSetting/globalSetting.service';
import { TLanguageCode } from '../../constant/GlobalInterface/language.interface';
import { CheckoutSummary } from '../Checkout/checkout.model';
import { TCurrentUser } from '../../constant/GlobalInterface/user.interface';

export const validateAndApplyOffer = async (
  checkoutId: string,
  offerIdentifier: string,
  currentUser: TCurrentUser,
  lang: TLanguageCode = 'en',
) => {
  const checkoutData = await CheckoutSummary.findById(checkoutId).lean();
  if (!checkoutData)
    throw new AppError(httpStatus.NOT_FOUND, 'CHECKOUT_SESSION_NOT_FOUND');

  if (checkoutData.customerId.toString() !== currentUser._id.toString()) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'CHECKOUT_DOES_NOT_BELONG_TO_USER',
    );
  }
  if (checkoutData.isConvertedToOrder) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'CANNOT_APPLY_OFFER_TO_COMPLETED_CHECKOUT',
    );
  }

  const offer = await findAndValidateOffer(
    offerIdentifier,
    checkoutData,
    currentUser,
  );

  if (!offer) {
    const resetPayload = await calculateOfferRemoval(checkoutData, lang);
    const updatedCheckout = await CheckoutSummary.findByIdAndUpdate(
      checkoutId,
      { $set: resetPayload },
      { new: true },
    ).lean();

    return {
      messageKey: 'OFFER_REMOVED_OR_INVALID',
      data: updatedCheckout,
    };
  }

  const discountData = calculateOfferDiscount(offer, checkoutData);
  const updatePayload = await rebuildCheckoutSummary(
    checkoutData,
    offer,
    discountData,
    lang,
  );

  const updatedCheckout = await CheckoutSummary.findByIdAndUpdate(
    checkoutId,
    { $set: updatePayload },
    { new: true, runValidators: true },
  ).lean();

  return {
    messageKey: 'OFFER_APPLIED_SUCCESS',
    data: updatedCheckout,
  };
};

export const findAndValidateOffer = async (
  offerIdentifier: string,
  checkoutData: any,
  currentUser: any,
) => {
  if (!offerIdentifier || offerIdentifier.trim() === '') return null;

  const now = new Date();
  const baseQuery = {
    isActive: true,
    isDeleted: false,
    validFrom: { $lte: now },
    expiresAt: { $gte: now },
    $or: [{ vendorId: checkoutData.vendorId }, { vendorId: null }],
  };

  const isObjectId = mongoose.Types.ObjectId.isValid(offerIdentifier);
  const offer = isObjectId
    ? await Offer.findOne({ ...baseQuery, _id: offerIdentifier })
    : await Offer.findOne({
        ...baseQuery,
        code: offerIdentifier.toUpperCase(),
      });

  if (!offer)
    throw new AppError(httpStatus.BAD_REQUEST, 'INVALID_OFFER_OR_PROMO_CODE');

  if (!offer.isAutoApply && isObjectId) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'OFFER_REQUIRES_VALID_PROMO_CODE',
    );
  }

  const originalCartTotal = roundTo2(
    checkoutData.orderCalculation.itemsSubtotal +
      (checkoutData.orderCalculation.totalOfferDiscount || 0),
  );

  if (originalCartTotal < (offer?.minOrderAmount || 0)) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'MIN_ORDER_AMOUNT_REQUIRED_TEMPLATE',
      {
        amount: offer.minOrderAmount || 0,
      },
    );
  }

  if (
    offer.offerType === 'FLAT' &&
    originalCartTotal < (offer?.discountValue || 0)
  ) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'MIN_ORDER_AMOUNT_REQUIRED_TEMPLATE',
      {
        amount: offer.discountValue || 0,
      },
    );
  }

  const hasApplicableProducts =
    offer.applicableProducts && offer.applicableProducts.length > 0;
  if (hasApplicableProducts) {
    const isProductMatched = checkoutData.items.some((item: any) => {
      const cartProductId = item.productId?.toString();
      return offer?.applicableProducts?.some(
        (pId: any) => pId.toString() === cartProductId,
      );
    });

    if (!isProductMatched) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'OFFER_NOT_VALID_FOR_CART_PRODUCTS',
      );
    }
  }

  const promoId = offer._id.toString();
  const usageCount = await Order.countDocuments({
    customerId: currentUser._id,
    $expr: { $eq: [{ $toString: '$offer.offerApplied.promoId' }, promoId] },
    orderStatus: { $ne: 'CANCELLED' },
  });

  if (usageCount >= (offer.userUsageLimit || 0)) {
    throw new AppError(httpStatus.BAD_REQUEST, 'OFFER_USAGE_LIMIT_EXCEEDED');
  }

  return offer;
};

export const calculateOfferDiscount = (offer: any, checkoutData: any) => {
  const originalCartTotal = roundTo2(
    checkoutData.orderCalculation.itemsSubtotal +
      (checkoutData.orderCalculation.totalOfferDiscount || 0),
  );
  const deliveryChargeBase = checkoutData.delivery.charge;

  let totalOfferDiscount = 0;
  let finalDeliveryChargeNet = deliveryChargeBase;
  let bogoSnapshot = null;

  switch (offer.offerType) {
    case 'PERCENT': {
      const calculated = (originalCartTotal * (offer.discountValue || 0)) / 100;
      totalOfferDiscount = offer.maxDiscountAmount
        ? Math.min(calculated, offer.maxDiscountAmount)
        : calculated;
      break;
    }
    case 'FLAT': {
      totalOfferDiscount = Math.min(
        offer.discountValue || 0,
        originalCartTotal,
      );
      break;
    }
    case 'FREE_DELIVERY': {
      finalDeliveryChargeNet = 0;
      break;
    }
    case 'BOGO': {
      const bogo = offer.bogo!;
      const targetItem = checkoutData.items.find(
        (i: any) => i.productId?.toString() === bogo.productId.toString(),
      );
      if (targetItem) {
        const freeQty =
          Math.floor(
            targetItem.itemSummary.quantity / (bogo.buyQty + bogo.getQty),
          ) * bogo.getQty;
        totalOfferDiscount = freeQty * targetItem.productPricing.unitPrice;
        bogoSnapshot = {
          buyQty: bogo.buyQty,
          getQty: bogo.getQty,
          productId: bogo.productId,
          productName: targetItem.name,
        };
      }
      break;
    }
  }

  return {
    totalOfferDiscount: roundTo2(totalOfferDiscount),
    finalDeliveryChargeNet,
    bogoSnapshot,
  };
};

export const rebuildCheckoutSummary = async (
  checkoutData: any,
  offer: any,
  discountData: any,
  lang: TLanguageCode = 'en',
) => {
  const { totalOfferDiscount, finalDeliveryChargeNet, bogoSnapshot } =
    discountData;
  const { items } = checkoutData;

  const originalCartTotal = roundTo2(
    checkoutData.orderCalculation.itemsSubtotal +
      (checkoutData.orderCalculation.totalOfferDiscount || 0),
  );

  const discountRatio =
    originalCartTotal > 0 ? totalOfferDiscount / originalCartTotal : 0;
  let distributedDiscountSum = 0;

  const updatedItems = items.map((item: any, index: number) => {
    // Aligned with the verified schema keys
    const itemOriginalGrandTotal = item.itemSummary.grandTotal;
    let lineOfferDiscount = 0;

    if (index === items.length - 1) {
      lineOfferDiscount = roundTo2(totalOfferDiscount - distributedDiscountSum);
    } else {
      lineOfferDiscount = roundTo2(itemOriginalGrandTotal * discountRatio);
    }
    distributedDiscountSum = roundTo2(
      distributedDiscountSum + lineOfferDiscount,
    );

    // Calculate new pro-rata distributed grand total for the item
    const newItemGrandTotal = roundTo2(
      itemOriginalGrandTotal - lineOfferDiscount,
    );
    const itemInternalDiscountRatio =
      itemOriginalGrandTotal > 0
        ? lineOfferDiscount / itemOriginalGrandTotal
        : 0;

    // Distribute discount down to addons using strict INCLUSIVE tax formula
    const updatedAddons = item.addons.map((addon: any) => {
      const addonPromoDisc = roundTo2(
        addon.lineTotal * itemInternalDiscountRatio,
      );
      const newAddonLineTotal = roundTo2(addon.lineTotal - addonPromoDisc);
      const newAddonUnitPrice = roundTo2(newAddonLineTotal / addon.quantity);
      const newAddonTaxAmount = roundTo2(
        (newAddonLineTotal * addon.taxRate) / (100 + addon.taxRate),
      );

      return {
        ...addon,
        promoDiscountAmount: addonPromoDisc,
        unitPrice: newAddonUnitPrice,
        lineTotal: newAddonLineTotal,
        taxAmount: newAddonTaxAmount,
      };
    });

    const newAddonsLineTotalSum = updatedAddons.reduce(
      (sum: number, a: any) => sum + a.lineTotal,
      0,
    );
    const newAddonsTaxSum = updatedAddons.reduce(
      (sum: number, a: any) => sum + a.taxAmount,
      0,
    );

    // Derived product financial breakdown
    const newProductLineTotal = roundTo2(
      newItemGrandTotal - newAddonsLineTotalSum,
    );
    const newProductUnitPrice = roundTo2(
      newProductLineTotal / item.itemSummary.quantity,
    );
    const newProductTaxAmount = roundTo2(
      (newProductLineTotal * item.productPricing.taxRate) /
        (100 + item.productPricing.taxRate),
    );

    const newItemTotalTax = roundTo2(newProductTaxAmount + newAddonsTaxSum);

    const itemNetPriceWithoutTax = roundTo2(
      newItemGrandTotal - newItemTotalTax,
    );
    const itemComm = roundTo2(
      itemNetPriceWithoutTax * (item.commission.deliGoCommissionRate / 100),
    );
    const itemCommVat = roundTo2(
      itemComm * (item.commission.deliGoCommissionVatRate / 100),
    );

    return {
      ...item,
      addons: updatedAddons,
      productPricing: {
        ...item.productPricing,
        promoDiscountAmount: roundTo2(
          lineOfferDiscount / item.itemSummary.quantity,
        ),
        unitPrice: newProductUnitPrice,
        lineTotal: newProductLineTotal,
        taxAmount: newProductTaxAmount,
      },
      itemSummary: {
        ...item.itemSummary,
        totalPromoDiscount: lineOfferDiscount,
        totalTaxAmount: newItemTotalTax,
        grandTotal: newItemGrandTotal,
      },
      commission: {
        ...item.commission,
        deliGoCommissionAmount: itemComm,
        deliGoCommissionVatAmount: itemCommVat,
      },
      vendor: {
        vendorEarningsWithoutTax: roundTo2(
          itemNetPriceWithoutTax - (itemComm + itemCommVat),
        ),
        payableTax: newItemTotalTax,
        vendorNetEarnings: roundTo2(
          newItemGrandTotal - (itemComm + itemCommVat),
        ),
      },
    };
  });

  const globalSettings = await GlobalSettingsService.getGlobalSettings();
  const serviceCharge = checkoutData.orderCalculation.serviceCharge || 0;

  const finalGlobalTaxAmount = updatedItems.reduce(
    (sum: any, i: any) => sum + i.itemSummary.totalTaxAmount,
    0,
  );
  const finalItemsSubTotal = updatedItems.reduce(
    (sum: any, i: any) => sum + i.itemSummary.grandTotal,
    0,
  );

  const deliveryVatRate = (globalSettings?.deliveryVatRate || 23) / 100;
  const deliveryVat = roundTo2(finalDeliveryChargeNet * deliveryVatRate);
  const totalDeliveryCharge = roundTo2(finalDeliveryChargeNet + deliveryVat);

  const totalCommAmt = updatedItems.reduce(
    (sum: any, i: any) => sum + i.commission.deliGoCommissionAmount,
    0,
  );
  const totalCommVat = updatedItems.reduce(
    (sum: any, i: any) => sum + i.commission.deliGoCommissionVatAmount,
    0,
  );
  const totalDeduction = roundTo2(totalCommAmt + totalCommVat);

  const grandTotal = roundTo2(
    finalItemsSubTotal + totalDeliveryCharge + serviceCharge,
  );
  const fleetFee = roundTo2(
    finalDeliveryChargeNet *
      ((globalSettings?.fleetManagerCommissionPercent || 0) / 100),
  );

  const flattenedTitle =
    typeof offer.title === 'object'
      ? offer.title?.[lang] || offer.title?.['en'] || ''
      : offer.title || '';

  return {
    items: updatedItems,
    orderCalculation: {
      ...checkoutData.orderCalculation,
      totalTaxAmount: roundTo2(finalGlobalTaxAmount),
      itemsSubtotal: finalItemsSubTotal,
      totalOfferDiscount,
    },
    delivery: {
      ...checkoutData.delivery,
      charge: finalDeliveryChargeNet,
      vatAmount: deliveryVat,
      totalDeliveryCharge,
    },
    payoutSummary: {
      grandTotal,
      deliGoCommission: {
        rate: globalSettings?.platformCommissionPercent || 0,
        amount: totalCommAmt,
        vatAmount: totalCommVat,
        totalDeduction,
        earnedServiceCharge: serviceCharge,
        deliveryVatAmount: deliveryVat,
      },
      fleet: {
        rate: globalSettings?.fleetManagerCommissionPercent || 0,
        fee: fleetFee,
      },
      vendor: {
        earningsWithoutTax: roundTo2(
          finalItemsSubTotal - finalGlobalTaxAmount - totalDeduction,
        ),
        payableTax: roundTo2(finalGlobalTaxAmount),
        vendorNetPayout: roundTo2(finalItemsSubTotal - totalDeduction),
      },
      rider: {
        riderNetEarnings: roundTo2(finalDeliveryChargeNet - fleetFee),
      },
    },
    offer: {
      isApplied: offer._id !== null,
      offerApplied: offer._id
        ? {
            promoId: offer._id,
            title: flattenedTitle,
            code: offer.code,
            offerType: offer.offerType,
            discountValue: offer.discountValue,
            maxDiscountAmount: offer.maxDiscountAmount,
            bogoSnapshot,
          }
        : null,
    },
  };
};

export const calculateOfferRemoval = async (
  checkoutData: any,
  lang: TLanguageCode = 'en',
) => {
  const cleanItems = checkoutData.items.map((item: any) => {
    // Reverts back to baseline original state pricing snapshots securely
    const originalItemGrandTotal = roundTo2(
      (item.productPricing.originalPrice -
        item.productPricing.productDiscountAmount) *
        item.itemSummary.quantity +
        item.addons.reduce(
          (sum: number, a: any) => sum + a.originalPrice * a.quantity,
          0,
        ),
    );

    return {
      ...item,
      itemSummary: {
        ...item.itemSummary,
        grandTotal: originalItemGrandTotal,
        totalPromoDiscount: 0,
      },
    };
  });

  const cleanCheckoutData = {
    ...checkoutData,
    items: cleanItems,
    orderCalculation: {
      ...checkoutData.orderCalculation,
      totalOfferDiscount: 0,
    },
  };

  const zeroDiscountData = {
    totalOfferDiscount: 0,
    finalDeliveryChargeNet: checkoutData.delivery.charge,
    bogoSnapshot: null,
  };

  const dummyOffer = { _id: null, title: '', code: '', offerType: 'NONE' };
  return await rebuildCheckoutSummary(
    cleanCheckoutData,
    dummyOffer,
    zeroDiscountData,
    lang,
  );
};

export const formatOfferResponse = (
  offerData: any,
  lang: TLanguageCode = 'en',
) => {
  const formatSingleOffer = (item: any) => {
    const itemObj = item.toObject?.() || item;
    return {
      ...itemObj,
      title: itemObj.title?.[lang] || itemObj.title?.['en'] || '',
      description:
        itemObj.description?.[lang] || itemObj.description?.['en'] || '',
    };
  };

  if (Array.isArray(offerData)) {
    return offerData.map((item) => formatSingleOffer(item));
  }
  return formatSingleOffer(offerData);
};
