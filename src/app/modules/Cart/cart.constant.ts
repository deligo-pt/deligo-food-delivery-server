import { roundTo4 } from '../../utils/mathProvider';
import { TCart } from './cart.interface';

/* eslint-disable @typescript-eslint/no-explicit-any */
export const recalculateCartTotals = async (cart: TCart) => {
  const activeItems = cart.items.filter((i: any) => i.isActive === true);

  if (activeItems.length === 0) {
    cart.totalItems = 0;
    cart.cartCalculation = {
      totalOriginalPrice: 0,
      totalProductDiscount: 0,
      taxableAmount: 0,
      totalTaxAmount: 0,
      grandTotal: 0,
    };
    return cart;
  }

  const totals = activeItems.reduce(
    (acc, item) => {
      const { itemSummary, productPricing } = item;

      acc.totalItems += itemSummary.quantity || 0;
      acc.totalOriginalPrice +=
        (productPricing.originalPrice || 0) * (itemSummary.quantity || 0);
      acc.totalProductDiscount += itemSummary.totalProductDiscount || 0;
      acc.taxableAmount += itemSummary.totalBeforeTax || 0;
      acc.totalTaxAmount += itemSummary.totalTaxAmount || 0;

      return acc;
    },
    {
      totalItems: 0,
      totalOriginalPrice: 0,
      totalProductDiscount: 0,
      taxableAmount: 0,
      totalTaxAmount: 0,
    },
  );

  cart.totalItems = totals.totalItems;

  cart.cartCalculation = {
    totalOriginalPrice: roundTo4(totals.totalOriginalPrice),
    totalProductDiscount: roundTo4(totals.totalProductDiscount),
    taxableAmount: roundTo4(totals.taxableAmount),
    totalTaxAmount: roundTo4(totals.totalTaxAmount),
    grandTotal: roundTo4(totals.taxableAmount + totals.totalTaxAmount),
  };

  return cart;
};
