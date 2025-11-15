import express from 'express';
import { AuthRoutes } from '../modules/Auth/auth.route';
import { ProfileRoutes } from '../modules/Profile/profile.route';
import { VendorRoutes } from '../modules/Vendor/vendor.route';
import { CustomerRoutes } from '../modules/Customer/customer.route';
import { ProductRoutes } from '../modules/Product/product.route';
import { CartRoutes } from '../modules/Cart/cart.route';
import { OrderRoutes } from '../modules/Order/order.route';
import { PaymentRoutes } from '../modules/Payment/payment.route';
import { FleetManagerRoutes } from '../modules/Fleet-Manager/fleet-manager.route';
import { AdminRoutes } from '../modules/Admin/admin.route';
import { DeliveryPartnerRoutes } from '../modules/Delivery-Partner/delivery-partner.route';
import { CouponRoutes } from '../modules/Coupon/coupon.route';
import { NotificationRoutes } from '../modules/Notification/notification.route';
import { CategoryRoutes } from '../modules/Category/category.route';
import { OfferRoutes } from '../modules/Offer/offer.route';
import { RatingRoutes } from '../modules/Rating/rating.route';

const router = express.Router();

const moduleRoutes = [
  {
    path: '/auth',
    route: AuthRoutes,
  },
  {
    path: '/customers',
    route: CustomerRoutes,
  },
  {
    path: '/vendors',
    route: VendorRoutes,
  },
  {
    path: '/fleet-managers',
    route: FleetManagerRoutes,
  },
  {
    path: '/admins',
    route: AdminRoutes,
  },
  {
    path: '/delivery-partners',
    route: DeliveryPartnerRoutes,
  },
  {
    path: '/products',
    route: ProductRoutes,
  },
  {
    path: '/carts',
    route: CartRoutes,
  },
  {
    path: '/coupons',
    route: CouponRoutes,
  },
  {
    path: '/orders',
    route: OrderRoutes,
  },
  {
    path: '/payment',
    route: PaymentRoutes,
  },
  {
    path: '/profile',
    route: ProfileRoutes,
  },
  {
    path: '/notifications',
    route: NotificationRoutes,
  },
  {
    path: '/categories',
    route: CategoryRoutes,
  },
  {
    path: '/offers',
    route: OfferRoutes,
  },
  {
    path: '/ratings',
    route: RatingRoutes,
  },
];

moduleRoutes.forEach((route) => router.use(route.path, route.route));
export default router;
