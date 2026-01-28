import { Coupon } from '../Coupon/coupon.model';
import { Product } from '../Product/product.model';
import { TCart } from './cart.interface';

/* eslint-disable @typescript-eslint/no-explicit-any */
export const recalculateCartTotals = async (cart: TCart) => {
  const activeItems = cart.items.filter((i: any) => i.isActive === true);

  if (activeItems.length === 0) {
    cart.totalItems = 0;
    cart.totalPrice = 0;
    cart.taxAmount = 0;
    cart.discount = 0;
    cart.subtotal = 0;
    cart.couponId = null;
    return cart;
  }

  const totalTax = activeItems.reduce(
    (sum: number, i: any) => sum + (Number(i.taxAmount) || 0),
    0,
  );

  const totalBasePrice = activeItems.reduce(
    (sum: number, i: any) => sum + (Number(i.totalBeforeTax) || 0),
    0,
  );

  cart.totalItems = activeItems.reduce(
    (sum: number, i: any) => sum + i.quantity,
    0,
  );

  cart.taxAmount = Number(totalTax.toFixed(2));

  cart.totalPrice = Number(totalBasePrice.toFixed(2));

  // Auto re-apply or validate coupon
  if (cart.couponId) {
    const coupon = await Coupon.findOne({
      _id: cart.couponId,
      isActive: true,
      isDeleted: false,
    });

    const now = new Date();
    const isExpired =
      coupon &&
      ((coupon.validFrom && now < coupon.validFrom) ||
        (coupon.expiresAt && now > coupon.expiresAt));

    if (!coupon || isExpired) {
      cart.discount = 0;
      cart.couponId = null;
    } else {
      // Category validation
      const uniqueProductIds = [
        ...new Set(activeItems.map((i: any) => i.productId.toString())),
      ];
      const productsInCart = await Product.find({
        _id: { $in: uniqueProductIds },
      });
      const cartCategoryIds = productsInCart.map((p) => p.category?.toString());
      const couponCategoryIds =
        coupon.applicableCategories?.map((c) => c.toString()) || [];

      const isCategoryMatch =
        couponCategoryIds.length === 0 ||
        cartCategoryIds.some((cat) => couponCategoryIds.includes(cat));

      if (
        !isCategoryMatch ||
        (coupon.minPurchase && cart.totalPrice < coupon.minPurchase)
      ) {
        cart.discount = 0;
        cart.couponId = null;
      } else {
        // Calculate final discount
        let calculatedDiscount = 0;
        if (coupon.discountType === 'PERCENT') {
          calculatedDiscount = (cart.totalPrice * coupon.discountValue) / 100;
          if (coupon.maxDiscount)
            calculatedDiscount = Math.min(
              calculatedDiscount,
              coupon.maxDiscount,
            );
        } else {
          calculatedDiscount = coupon.discountValue;
        }
        cart.discount = Number(calculatedDiscount.toFixed(2));
      }
    }
  } else {
    cart.discount = 0;
  }

  const finalSubtotal = cart.totalPrice + cart.taxAmount - (cart.discount || 0);

  // Set final subtotal (Net Total)
  cart.subtotal = Number(Math.max(0, finalSubtotal).toFixed(2));

  return cart;
};
