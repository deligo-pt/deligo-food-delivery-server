/* eslint-disable @typescript-eslint/no-explicit-any */
// utils/offer.utils.ts

import httpStatus from 'http-status';
import AppError from '../../errors/AppError';
import { Order } from '../Order/order.model';
import { roundTo2 } from '../../utils/mathProvider';
import { Offer } from './offer.model';
import mongoose from 'mongoose';
import { GlobalSettingsService } from '../GlobalSetting/globalSetting.service';

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
    throw new AppError(httpStatus.BAD_REQUEST, 'Invalid offer or promo code');

  const originalTaxableAmount = roundTo2(
    checkoutData.orderCalculation.taxableAmount +
      (checkoutData.orderCalculation.totalOfferDiscount || 0),
  );

  if (originalTaxableAmount < (offer?.minOrderAmount || 0)) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `This offer requires minimum order amount of ${offer.minOrderAmount}`,
    );
  }

  if (
    offer.offerType === 'FLAT' &&
    originalTaxableAmount < (offer?.discountValue || 0)
  ) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `This offer requires minimum order amount of ${offer.discountValue}`,
    );
  }

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

export const calculateOfferDiscount = (offer: any, checkoutData: any) => {
  const originalTaxableAmount = roundTo2(
    checkoutData.orderCalculation.taxableAmount +
      (checkoutData.orderCalculation.totalOfferDiscount || 0),
  );
  const deliveryChargeBase = checkoutData.delivery.charge;

  let totalOfferDiscount = 0;
  let finalDeliveryChargeNet = deliveryChargeBase;
  let bogoSnapshot = null;

  switch (offer.offerType) {
    case 'PERCENT': {
      const calculated =
        (originalTaxableAmount * (offer.discountValue || 0)) / 100;
      totalOfferDiscount = offer.maxDiscountAmount
        ? Math.min(calculated, offer.maxDiscountAmount)
        : calculated;
      break;
    }
    case 'FLAT': {
      totalOfferDiscount = Math.min(
        offer.discountValue || 0,
        originalTaxableAmount,
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

  const discountRatio =
    originalTaxableAmount > 0 ? totalOfferDiscount / originalTaxableAmount : 0;
  let distributedDiscountSum = 0;

  const updatedItems = items.map((item: any, index: number) => {
    const itemOriginalBeforeTax = roundTo2(
      item.itemSummary.totalBeforeTax +
        (item.itemSummary.totalPromoDiscount || 0),
    );
    let itemOfferDiscount = 0;

    if (index === items.length - 1) {
      itemOfferDiscount = Math.max(
        0,
        roundTo2(totalOfferDiscount - distributedDiscountSum),
      );
    } else {
      itemOfferDiscount = roundTo2(itemOriginalBeforeTax * discountRatio);
    }
    distributedDiscountSum = roundTo2(
      distributedDiscountSum + itemOfferDiscount,
    );

    const itemInternalDiscountRatio =
      itemOriginalBeforeTax > 0 ? itemOfferDiscount / itemOriginalBeforeTax : 0;
    const productBase = item.productPricing.priceAfterProductDiscount;
    const productPromoDisc = roundTo2(productBase * itemInternalDiscountRatio);
    const newProductUnitPrice = roundTo2(productBase - productPromoDisc);
    const newProductTax = roundTo2(
      newProductUnitPrice * (item.productPricing.taxRate / 100),
    );

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
    const newItemTaxableTotal = roundTo2(
      (newProductUnitPrice + newAddonsPriceTotal) * item.itemSummary.quantity,
    );
    const newItemTaxTotal = roundTo2(
      (newProductTax + newAddonsTaxTotal) * item.itemSummary.quantity,
    );

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
        promoDiscountAmount: productPromoDisc,
        unitPrice: newProductUnitPrice,
        lineTotal: newProductUnitPrice,
        taxAmount: newProductTax,
      },
      itemSummary: {
        ...item.itemSummary,
        totalPromoDiscount: itemOfferDiscount,
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

  const globalSettings = await GlobalSettingsService.getGlobalSettings();
  const finalGlobalTaxableAmount = updatedItems.reduce(
    (sum: any, i: any) => sum + i.itemSummary.totalBeforeTax,
    0,
  );
  const finalGlobalTaxAmount = updatedItems.reduce(
    (sum: any, i: any) => sum + i.itemSummary.totalTaxAmount,
    0,
  );
  const newDeliveryVat = roundTo2(
    finalDeliveryChargeNet * ((globalSettings?.deliveryVatRate || 0) / 100),
  );
  const totalDeliveryCharge = roundTo2(finalDeliveryChargeNet + newDeliveryVat);
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
    finalGlobalTaxableAmount + finalGlobalTaxAmount + totalDeliveryCharge,
  );
  const fleetFee = roundTo2(
    finalDeliveryChargeNet *
      ((globalSettings?.fleetManagerCommissionPercent || 0) / 100),
  );

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
      vatAmount: newDeliveryVat,
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
          totalDeliveryCharge - newDeliveryVat - fleetFee,
        ),
        payableTax: newDeliveryVat,
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
