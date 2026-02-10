import { roundTo4 } from '../../utils/mathProvider';
import { TCart } from './cart.interface';

/* eslint-disable @typescript-eslint/no-explicit-any */
export const recalculateCartTotals = async (cart: TCart) => {
  const activeItems = cart.items.filter((i: any) => i.isActive === true);

  if (activeItems.length === 0) {
    cart.totalItems = 0;
    cart.totalPrice = 0;
    cart.taxAmount = 0;
    cart.totalProductDiscount = 0;
    cart.subtotal = 0;
    return cart;
  }

  const totals = activeItems.reduce(
    (acc, item) => {
      acc.totalItems += item.quantity;
      acc.totalDiscount += (Number(item.discountAmount) || 0) * item.quantity;
      acc.totalTax += Number(item.taxAmount) || 0;
      acc.totalBasePrice += Number(item.totalBeforeTax) || 0;
      return acc;
    },
    { totalItems: 0, totalDiscount: 0, totalTax: 0, totalBasePrice: 0 },
  );

  cart.totalItems = totals.totalItems;
  cart.totalProductDiscount = roundTo4(totals.totalDiscount);
  cart.taxAmount = roundTo4(totals.totalTax);
  cart.totalPrice = roundTo4(totals.totalBasePrice);

  const finalSubtotal = cart.totalPrice + cart.taxAmount;

  // Set final subtotal (Net Total)
  cart.subtotal = roundTo4(Math.max(0, finalSubtotal));

  return cart;
};
