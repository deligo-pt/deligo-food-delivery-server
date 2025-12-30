import { Coupon } from '../Coupon/coupon.model';
import { Product } from '../Product/product.model';

/* eslint-disable @typescript-eslint/no-explicit-any */
export const recalculateCartTotals = async (cart: any) => {
  // 1. Get a fresh list of active items after the change
  const activeItems = cart.items.filter((i: any) => i.isActive === true);

  // 2. Update basic totals (before discount)
  const activeSubtotal = activeItems.reduce(
    (sum: number, i: any) => sum + i.subtotal,
    0
  );
  cart.totalItems = activeItems.reduce(
    (sum: number, i: any) => sum + i.quantity,
    0
  );
  cart.totalPrice = parseFloat(activeSubtotal.toFixed(2));

  // 3. Auto re-apply or validate coupon
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
      const productIds = activeItems.map((i: any) => i.productId.toString());
      const products = await Product.find({ _id: { $in: productIds } }).select(
        'category'
      );
      const cartCategories = products.map((p) => p.category.toLowerCase());
      const couponCategories =
        coupon.applicableCategories?.map((c: string) => c.toLowerCase()) || [];

      const categoryMatch =
        couponCategories.length === 0 ||
        cartCategories.some((cat) => couponCategories.includes(cat));

      if (!categoryMatch) {
        cart.discount = 0;
        cart.couponId = null;
      } else if (coupon.minPurchase && cart.totalPrice < coupon.minPurchase) {
        cart.discount = 0; // Keep couponId, but set discount to 0
      } else {
        // Calculate final discount
        let discount = 0;
        if (coupon.discountType === 'PERCENT') {
          discount = (cart.totalPrice * coupon.discountValue) / 100;
          if (coupon.maxDiscount)
            discount = Math.min(discount, coupon.maxDiscount);
        } else {
          discount = coupon.discountValue;
        }
        cart.discount = parseFloat(discount.toFixed(2));
      }
    }
  } else {
    cart.discount = 0;
  }

  // 4. Set final subtotal (Net Total)
  cart.subtotal = parseFloat(
    Math.max(0, cart.totalPrice - cart.discount).toFixed(2)
  );

  return cart;
};
