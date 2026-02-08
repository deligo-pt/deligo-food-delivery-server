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

  cart.totalProductDiscount = parseFloat(totalDiscount.toFixed(2));

  const totalTax = activeItems.reduce(
    (sum: number, i: any) => sum + (parseFloat(i.taxAmount.toFixed(2)) || 0),
    0,
  );
  cart.taxAmount = parseFloat(totalTax.toFixed(2));

  const totalBasePrice = activeItems.reduce(
    (sum: number, i: any) => sum + (Number(i.totalBeforeTax) || 0),
    0,
  );

  cart.totalPrice = parseFloat(totalBasePrice.toFixed(2));

  const finalSubtotal = cart.totalPrice + cart.taxAmount;

  // Set final subtotal (Net Total)
  cart.subtotal = parseFloat(Math.max(0, finalSubtotal).toFixed(2));

  return cart;
};
