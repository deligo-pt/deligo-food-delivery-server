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

  cart.totalItems = activeItems.reduce(
    (sum: number, i: any) => sum + i.quantity,
    0,
  );

  const totalDiscount = activeItems.reduce(
    (sum: number, i: any) => sum + Number(i.discountAmount || 0) * i.quantity,
    0,
  );

  cart.totalProductDiscount = Number(totalDiscount.toFixed(2));

  const totalTax = activeItems.reduce(
    (sum: number, i: any) => sum + (Number(i.taxAmount) || 0),
    0,
  );
  cart.taxAmount = Number(totalTax.toFixed(2));

  const totalBasePrice = activeItems.reduce(
    (sum: number, i: any) => sum + (Number(i.totalBeforeTax) || 0),
    0,
  );

  cart.totalPrice = Number(totalBasePrice.toFixed(2));

  const finalSubtotal = cart.totalPrice + cart.taxAmount;

  // Set final subtotal (Net Total)
  cart.subtotal = Number(Math.max(0, finalSubtotal).toFixed(2));

  return cart;
};
