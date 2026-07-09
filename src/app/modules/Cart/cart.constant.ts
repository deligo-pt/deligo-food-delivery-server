/* eslint-disable @typescript-eslint/no-explicit-any */
import { roundTo2 } from '../../utils/mathProvider';
import { TCart } from './cart.interface';

export const recalculateCartTotals = async (cart: TCart) => {
  const activeItems = cart.items.filter((i: any) => i.isActive === true);

  if (activeItems.length === 0) {
    cart.totalItems = 0;
    cart.cartCalculation = {
      totalOriginalPrice: 0,
      totalProductDiscount: 0,
      totalTaxAmount: 0,
      grandTotal: 0,
    };
    return cart;
  }

  const totals = activeItems.reduce(
    (acc, item) => {
      const { itemSummary, productPricing, addons } = item;

      acc.totalItems += itemSummary.quantity || 0;

      let itemOriginalPriceSum =
        (productPricing.originalPrice || 0) * (itemSummary.quantity || 0);

      if (addons && addons.length > 0) {
        addons.forEach((addon: any) => {
          itemOriginalPriceSum +=
            (addon.originalPrice || 0) * (addon.quantity || 0);
        });
      }

      acc.totalOriginalPrice += itemOriginalPriceSum;
      acc.totalProductDiscount += itemSummary.totalProductDiscount || 0;
      acc.grandTotal += itemSummary.grandTotal || 0;
      acc.totalTaxAmount += itemSummary.totalTaxAmount || 0;

      return acc;
    },
    {
      totalItems: 0,
      totalOriginalPrice: 0,
      totalProductDiscount: 0,
      totalTaxAmount: 0,
      grandTotal: 0,
    },
  );

  cart.cartCalculation = {
    totalOriginalPrice: roundTo2(totals.totalOriginalPrice),
    totalProductDiscount: roundTo2(totals.totalProductDiscount),
    totalTaxAmount: roundTo2(totals.totalTaxAmount),
    grandTotal: roundTo2(totals.grandTotal),
  };

  return cart;
};
