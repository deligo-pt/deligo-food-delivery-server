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
import { AnalyticsRoutes } from '../modules/Analytics/analytics.route';
import { CheckoutRoutes } from '../modules/Checkout/checkout.route';
import { SupportRoutes } from '../modules/Support/support.route';
import { ZoneRoutes } from '../modules/Zone/zone.route';
import { GlobalSettingRoutes } from '../modules/GlobalSetting/globalSetting.route';
import { AddOnsRoutes } from '../modules/Add-Ons/addOns.route';
import { sosRoutes } from '../modules/Sos/sos.route';
import { TaxRoutes } from '../modules/Tax/tax.route';
import { SponsorshipsRoutes } from '../modules/Sponsorships/sponsorships.route';

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
    path: '/checkout',
    route: CheckoutRoutes,
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
  {
    path: '/analytics',
    route: AnalyticsRoutes,
  },
  {
    path: '/support',
    route: SupportRoutes,
  },
  {
    path: '/zones',
    route: ZoneRoutes,
  },
  {
    path: '/globalSettings',
    route: GlobalSettingRoutes,
  },
  {
    path: '/add-ons',
    route: AddOnsRoutes,
  },
  {
    path: '/sos',
    route: sosRoutes,
  },
  {
    path: '/taxes',
    route: TaxRoutes,
  },
  {
    path: '/sponsorships',
    route: SponsorshipsRoutes,
  },
];

moduleRoutes.forEach((route) => router.use(route.path, route.route));
export default router;
