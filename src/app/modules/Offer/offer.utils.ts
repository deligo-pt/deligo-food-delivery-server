/* eslint-disable no-unused-vars */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
// utils/offer.utils.ts

import httpStatus from 'http-status';
import AppError from '../../errors/AppError';
import { Order } from '../Order/order.model';
import { roundTo2 } from '../../utils/mathProvider';
import { Offer } from './offer.model';
import mongoose from 'mongoose';
import { GlobalSettingsService } from '../GlobalSetting/globalSetting.service';

/**
 * Validates the offer by checking status, expiration, vendor mapping,
 * minimum order amount, and user usage limits.
 */
export const findAndValidateOffer = async (
  offerIdentifier: string,
  checkoutData: any,
  currentUser: any,
) => {
  // 1. If no code provided, skip validation
  if (!offerIdentifier || offerIdentifier.trim() === '') return null;

  const now = new Date();

  // 2. Setup base query: Offer must be active, not deleted, within date range,
  // and either global (vendorId: null) or specific to this vendor.
  const baseQuery = {
    isActive: true,
    isDeleted: false,
    validFrom: { $lte: now },
    expiresAt: { $gte: now },
    $or: [{ vendorId: checkoutData.vendorId }, { vendorId: null }],
  };

  // 3. Search by ID if it's a valid ObjectId, otherwise search by Promo Code
  const isObjectId = mongoose.Types.ObjectId.isValid(offerIdentifier);
  const offer = isObjectId
    ? await Offer.findOne({ ...baseQuery, _id: offerIdentifier })
    : await Offer.findOne({
        ...baseQuery,
        code: offerIdentifier.toUpperCase(),
      });

  if (!offer)
    throw new AppError(httpStatus.BAD_REQUEST, 'Invalid offer or promo code');

  // 4. Ensure Auto-apply offers aren't being forced manually via code incorrectly
  if (!offer.isAutoApply && isObjectId) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'This offer requires a valid promo code.',
    );
  }

  // 5. Calculate the original taxable amount before any existing offer discounts
  const originalTaxableAmount = roundTo2(
    checkoutData.orderCalculation.taxableAmount +
      (checkoutData.orderCalculation.totalOfferDiscount || 0),
  );

  // 6. Check if order meets the Minimum Amount requirement of the offer
  if (originalTaxableAmount < (offer?.minOrderAmount || 0)) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `This offer requires minimum order amount of ${offer.minOrderAmount}`,
    );
  }

  // 7. For FLAT discounts, ensure order total isn't less than the discount itself
  if (
    offer.offerType === 'FLAT' &&
    originalTaxableAmount < (offer?.discountValue || 0)
  ) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `This offer requires minimum order amount of ${offer.discountValue}`,
    );
  }

  // 7.5. Validate if the offer is applicable to the products in the cart
  const hasApplicableProducts =
    offer.applicableProducts && offer.applicableProducts.length > 0;

  if (hasApplicableProducts) {
    const isProductMatched = checkoutData.items.some((item: any) => {
      const cartProductId =
        item.productId?._id?.toString() || item.productId?.toString();
      return offer?.applicableProducts?.some(
        (pId: any) => pId.toString() === cartProductId,
      );
    });

    if (!isProductMatched) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'This offer is not valid for the products in your cart.',
      );
    }
  }

  // 8. Validate User Usage Limit (How many times this specific user has used this promo)
  const promoId = offer._id.toString();
  const usageCount = await Order.countDocuments({
    customerId: currentUser._id,
    $expr: { $eq: [{ $toString: '$offer.offerApplied.promoId' }, promoId] },
    orderStatus: { $ne: 'CANCELLED' },
  });

  if (usageCount >= (offer.userUsageLimit || 0)) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `You have exceeded the usage limit for this offer`,
    );
  }

  return offer;
};

/**
 * Calculates the total discount amount based on the offer type (PERCENT, FLAT, FREE_DELIVERY, BOGO).
 */
export const calculateOfferDiscount = (offer: any, checkoutData: any) => {
  const originalTaxableAmount = roundTo2(
    checkoutData.orderCalculation.taxableAmount +
      (checkoutData.orderCalculation.totalOfferDiscount || 0),
  );
  const deliveryChargeBase = checkoutData.delivery.charge;

  let totalOfferDiscount = 0;
  let finalDeliveryChargeNet = deliveryChargeBase;
  let bogoSnapshot = null;

  // 9. Determine discount based on Offer Type
  switch (offer.offerType) {
    case 'PERCENT': {
      // Percentage of total taxable amount, capped by maxDiscountAmount if exists
      const calculated =
        (originalTaxableAmount * (offer.discountValue || 0)) / 100;
      totalOfferDiscount = offer.maxDiscountAmount
        ? Math.min(calculated, offer.maxDiscountAmount)
        : calculated;
      break;
    }
    case 'FLAT': {
      // Fixed amount discount
      totalOfferDiscount = Math.min(
        offer.discountValue || 0,
        originalTaxableAmount,
      );
      break;
    }
    case 'FREE_DELIVERY': {
      // Set delivery charge to 0
      finalDeliveryChargeNet = 0;
      break;
    }
    case 'BOGO': {
      // Buy One Get One logic: Find target product and calculate free quantity value
      const bogo = offer.bogo!;
      const targetItem = checkoutData.items.find(
        (i: any) => i.productId?.toString() === bogo.productId.toString(),
      );
      if (targetItem) {
        const freeQty =
          Math.floor(
            targetItem.itemSummary.quantity / (bogo.buyQty + bogo.getQty),
          ) * bogo.getQty;
        totalOfferDiscount =
          freeQty * targetItem.productPricing.priceAfterProductDiscount;
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

/**
 * Rebuilds the entire checkout object, redistributing the discount across items,
 * recalculating taxes, commissions, and payouts.
 */
export const rebuildCheckoutSummary = async (
  checkoutData: any,
  offer: any,
  discountData: any,
) => {
  const { totalOfferDiscount, finalDeliveryChargeNet, bogoSnapshot } =
    discountData;
  const { items } = checkoutData;
  const originalTaxableAmount = roundTo2(
    checkoutData.orderCalculation.taxableAmount +
      (checkoutData.orderCalculation.totalOfferDiscount || 0),
  );

  // 10. Calculate the ratio of the discount to the total taxable amount for pro-rata distribution
  const discountRatio =
    originalTaxableAmount > 0 ? totalOfferDiscount / originalTaxableAmount : 0;
  let distributedDiscountSum = 0;

  // 11. Loop through items to apply discount pro-rata and recalculate item-level financials
  const updatedItems = items.map((item: any, index: number) => {
    const lineOriginalBeforeTax = roundTo2(
      item.productPricing.priceAfterProductDiscount * item.itemSummary.quantity,
    );
    let lineOfferDiscount = 0;

    // Distribute discount: last item gets the remainder to avoid rounding issues
    if (index === items.length - 1) {
      lineOfferDiscount = roundTo2(totalOfferDiscount - distributedDiscountSum);
    } else {
      lineOfferDiscount = roundTo2(lineOriginalBeforeTax * discountRatio);
    }
    distributedDiscountSum = roundTo2(
      distributedDiscountSum + lineOfferDiscount,
    );

    const newLineTotalBeforeTax = roundTo2(
      lineOriginalBeforeTax - lineOfferDiscount,
    );

    const newProductUnitPrice = roundTo2(
      newLineTotalBeforeTax / item.itemSummary.quantity,
    );

    const newProductTax =
      newProductUnitPrice * (item.productPricing.taxRate / 100);

    // 12. Recalculate Unit Prices, Addons, and Taxes after discount
    const itemInternalDiscountRatio =
      lineOriginalBeforeTax > 0 ? lineOfferDiscount / lineOriginalBeforeTax : 0;
    const unitPromoDiscount = lineOfferDiscount / item.itemSummary.quantity;

    // 13. Update individual addons within the item
    const updatedAddons = item.addons.map((addon: any) => {
      const addonPromoDisc = roundTo2(
        addon.originalPrice * itemInternalDiscountRatio,
      );
      const newAddonUnitPrice = roundTo2(addon.originalPrice - addonPromoDisc);
      return {
        ...addon,
        promoDiscountAmount: addonPromoDisc,
        unitPrice: newAddonUnitPrice,
        lineTotal: newAddonUnitPrice * addon.quantity,
        taxAmount: roundTo2(newAddonUnitPrice * (addon.taxRate / 100)),
      };
    });

    const newAddonsTaxTotal = updatedAddons.reduce(
      (sum: number, a: any) => sum + a.taxAmount * a.quantity,
      0,
    );
    const newAddonsPriceTotal = updatedAddons.reduce(
      (sum: number, a: any) => sum + a.unitPrice * a.quantity,
      0,
    );

    // 14. Summary of new item totals
    const newItemTaxableTotal = roundTo2(
      (newProductUnitPrice + newAddonsPriceTotal) * item.itemSummary.quantity,
    );
    const newItemTaxTotal = roundTo2(
      (newProductTax + newAddonsTaxTotal) * item.itemSummary.quantity,
    );

    // 15. Recalculate Platform Commission based on new discounted price
    const itemComm = roundTo2(
      newItemTaxableTotal * (item.commission.deliGoCommissionRate / 100),
    );
    const itemCommVat = roundTo2(
      itemComm * (item.commission.deliGoCommissionVatRate / 100),
    );

    return {
      ...item,
      addons: updatedAddons,
      productPricing: {
        ...item.productPricing,
        promoDiscountAmount: roundTo2(unitPromoDiscount),
        unitPrice: newProductUnitPrice,
        lineTotal: newProductUnitPrice,
        taxAmount: roundTo2(newProductTax),
      },
      itemSummary: {
        ...item.itemSummary,
        totalPromoDiscount: lineOfferDiscount,
        totalBeforeTax: newItemTaxableTotal,
        totalTaxAmount: newItemTaxTotal,
        grandTotal: roundTo2(newItemTaxableTotal + newItemTaxTotal),
      },
      commission: {
        ...item.commission,
        deliGoCommissionAmount: itemComm,
        deliGoCommissionVatAmount: itemCommVat,
      },
      vendor: {
        vendorEarningsWithoutTax: roundTo2(
          newItemTaxableTotal - (itemComm + itemCommVat),
        ),
        payableTax: roundTo2(newItemTaxTotal),
        vendorNetEarnings: roundTo2(
          newItemTaxableTotal + newItemTaxTotal - (itemComm + itemCommVat),
        ),
      },
    };
  });

  // 16. Final global calculations (Total Order Level)
  const globalSettings = await GlobalSettingsService.getGlobalSettings();
  const finalGlobalTaxableAmount = updatedItems.reduce(
    (sum: any, i: any) => sum + i.itemSummary.totalBeforeTax,
    0,
  );
  const finalGlobalTaxAmount = updatedItems.reduce(
    (sum: any, i: any) => sum + i.itemSummary.totalTaxAmount,
    0,
  );

  // 17. Recalculate Delivery VAT and Total Delivery Charge
  const deliveryVatRate = (globalSettings?.deliveryVatRate || 0) / 100;
  const rawDeliveryVat = finalDeliveryChargeNet * deliveryVatRate;

  const deliveryVat = roundTo2(rawDeliveryVat);

  const totalDeliveryCharge = roundTo2(finalDeliveryChargeNet + deliveryVat);

  // 18. Consolidate Platform Commissions
  const totalCommAmt = updatedItems.reduce(
    (sum: any, i: any) => sum + i.commission.deliGoCommissionAmount,
    0,
  );
  const totalCommVat = updatedItems.reduce(
    (sum: any, i: any) => sum + i.commission.deliGoCommissionVatAmount,
    0,
  );
  const totalDeduction = roundTo2(totalCommAmt + totalCommVat);

  // 19. Calculate Final Grand Total and Fleet Fee

  const finalItemsGrandTotal = updatedItems.reduce(
    (sum: any, i: any) => sum + i.itemSummary.grandTotal,
    0,
  );

  const grandTotal = roundTo2(finalItemsGrandTotal + totalDeliveryCharge);

  // const grandTotal = roundTo2(
  //   finalGlobalTaxableAmount + finalGlobalTaxAmount + totalDeliveryCharge,
  // );
  const fleetFee = roundTo2(
    finalDeliveryChargeNet *
      ((globalSettings?.fleetManagerCommissionPercent || 0) / 100),
  );

  // 20. Return the complete updated checkout object structure
  return {
    items: updatedItems,
    orderCalculation: {
      ...checkoutData.orderCalculation,
      taxableAmount: finalGlobalTaxableAmount,
      totalTaxAmount: finalGlobalTaxAmount,
      totalOfferDiscount,
    },
    delivery: {
      ...checkoutData.delivery,
      charge: finalDeliveryChargeNet,
      vatAmount: deliveryVat,
      totalDeliveryCharge,
    },
    payoutSummary: {
      ...checkoutData.payoutSummary,
      grandTotal,
      deliGoCommission: {
        rate: globalSettings?.platformCommissionPercent || 0,
        amount: totalCommAmt,
        vatAmount: totalCommVat,
        totalDeduction,
      },
      vendor: {
        earningsWithoutTax: roundTo2(finalGlobalTaxableAmount - totalDeduction),
        payableTax: roundTo2(finalGlobalTaxAmount),
        vendorNetPayout: roundTo2(
          finalGlobalTaxableAmount + finalGlobalTaxAmount - totalDeduction,
        ),
      },
      rider: {
        earningsWithoutTax: roundTo2(
          totalDeliveryCharge - deliveryVat - fleetFee,
        ),
        payableTax: deliveryVat,
        riderNetEarnings: roundTo2(totalDeliveryCharge - fleetFee),
      },
      fleet: {
        rate: globalSettings?.fleetManagerCommissionPercent || 0,
        fee: fleetFee,
      },
    },
    offer: {
      isApplied: true,
      offerApplied: {
        promoId: offer._id,
        title: offer.title,
        code: offer.code,
        offerType: offer.offerType,
        discountValue: offer.discountValue,
        maxDiscountAmount: offer.maxDiscountAmount,
        bogoSnapshot,
      },
    },
  };
};

/**
 * Utility to reset checkout state to its original values by removing any applied offers.
 * This ensures unit prices, taxes, and payouts are recalculated without discounts.
 */
export const calculateOfferRemoval = async (checkoutData: any) => {
  const cleanItems = checkoutData.items.map((item: any) => ({
    ...item,
    productPricing: {
      ...item.productPricing,
      unitPrice: item.productPricing.priceAfterProductDiscount,
      promoDiscountAmount: 0,
    },
    itemSummary: {
      ...item.itemSummary,
      totalPromoDiscount: 0,
    },
  }));

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

  const updatePayload = await rebuildCheckoutSummary(
    cleanCheckoutData,
    dummyOffer,
    zeroDiscountData,
  );

  const { offer: _, ...otherUpdates } = updatePayload;

  return {
    ...otherUpdates,
    offer: {
      isApplied: false,
      offerApplied: null,
    },
  };
};
