import { Router } from 'express';
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
import { NotificationRoutes } from '../modules/Notification/notification.route';
import { CategoryRoutes } from '../modules/Category/category.route';
import { OfferRoutes } from '../modules/Offer/offer.route';
import { RatingRoutes } from '../modules/Rating/rating.route';
import { AnalyticsRoutes } from '../modules/Analytics/analytics.route';
import { CheckoutRoutes } from '../modules/Checkout/checkout.route';
import { ZoneRoutes } from '../modules/Zone/zone.route';
import { GlobalSettingRoutes } from '../modules/GlobalSetting/globalSetting.route';
import { AddOnsRoutes } from '../modules/Add-Ons/addOns.route';
import { sosRoutes } from '../modules/Sos/sos.route';
import { TaxRoutes } from '../modules/Tax/tax.route';
import { SponsorshipsRoutes } from '../modules/Sponsorships/sponsorships.route';
import { TestRoutes } from '../modules/Test/test.route';
import { PayoutRoutes } from '../modules/Payout/payout.route';
import { WalletRoutes } from '../modules/Wallet/wallet.route';
import { transactionRoutes } from '../modules/Transaction/transaction.route';
import { UploadRoutes } from '../modules/Upload/upload.route';
import { SupportRoutes } from '../modules/Support/support.route';
import { IngredientRoutes } from '../modules/Ingredients/ingredients.route';
import { IngredientOrderRoutes } from '../modules/Ingredient-Order/ing-order.route';
import { PointsRoutes } from '../modules/Points/points.route';
import { RestrictedItemsRoutes } from '../modules/RestrictedItems/restrictedItems.route';

const router = Router();

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
    path: '/payouts',
    route: PayoutRoutes,
  },
  {
    path: '/wallets',
    route: WalletRoutes,
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

  {
    path: '/test',
    route: TestRoutes,
  },
  {
    path: '/transactions',
    route: transactionRoutes,
  },
  {
    path: '/uploads',
    route: UploadRoutes,
  },
  {
    path: '/ingredients',
    route: IngredientRoutes,
  },
  {
    path: '/ingredients-order',
    route: IngredientOrderRoutes,
  },
  {
    path: '/points',
    route: PointsRoutes,
  },
  {
    path: '/restricted-items',
    route: RestrictedItemsRoutes,
  },
];

moduleRoutes.forEach((route) => router.use(route.path, route.route));
export default router;
