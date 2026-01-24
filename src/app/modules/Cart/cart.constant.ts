import { Coupon } from '../Coupon/coupon.model';
import { Product } from '../Product/product.model';
import { TCart } from './cart.interface';

/* eslint-disable @typescript-eslint/no-explicit-any */
export const recalculateCartTotals = async (cart: TCart) => {
  const activeItems = cart.items.filter((i: any) => i.isActive === true);

  if (activeItems.length === 0) {
    cart.totalItems = 0;
    cart.totalPrice = 0;
    cart.discount = 0;
    cart.subtotal = 0;
    cart.couponId = null;
    return cart;
  }

  // Update basic totals (before discount)
  const activeSubtotal = activeItems.reduce(
    (sum: number, i: any) => sum + i.subtotal,
    0,
  );
  cart.totalItems = activeItems.reduce(
    (sum: number, i: any) => sum + i.quantity,
    0,
  );
  cart.totalPrice = Number(activeSubtotal.toFixed(2));

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
      }).select('category');
      console.log({ productsInCart });
      const cartCategoryIds = productsInCart.map((p) => p.category);
      console.log({ cartCategoryIds });
      const couponCategoryIds =
        coupon.applicableCategories?.map((c: string) => c.toLowerCase()) || [];

      const isCategoryMatch =
        cartCategoryIds.length === 0 ||
        couponCategoryIds.some((cat) => couponCategoryIds.includes(cat));

      if (!isCategoryMatch) {
        cart.discount = 0;
        cart.couponId = null;
      } else if (coupon.minPurchase && cart.totalPrice < coupon.minPurchase) {
        cart.discount = 0;
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

  // Set final subtotal (Net Total)
  cart.subtotal = Number(
    Math.max(0, cart.totalPrice - cart.discount).toFixed(2),
  );

  return cart;
};
