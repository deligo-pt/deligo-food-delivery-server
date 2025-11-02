import express from 'express';
import { AuthRoutes } from '../modules/Auth/auth.route';
// import { MeilisearchRoutes } from '../modules/Meilisearch/meilisearch.routes';
import { ProfileRoutes } from '../modules/Profile/profile.route';
import { VendorRoutes } from '../modules/Vendor/vendor.route';
import { UserRoutes } from '../modules/User/user.route';
import { AgentRoutes } from '../modules/Agent/agent.route';
import { ProductRoutes } from '../modules/Product/product.route';
import { CartRoutes } from '../modules/Cart/cart.route';

const router = express.Router();

const moduleRoutes = [
  {
    path: '/auth',
    route: AuthRoutes,
  },
  // {
  //   path: '/search-items',
  //   route: MeilisearchRoutes,
  // },
  {
    path: '/users',
    route: UserRoutes,
  },
  {
    path: '/vendors',
    route: VendorRoutes,
  },
  {
    path: '/agents',
    route: AgentRoutes,
  },
  {
    path: '/products',
    route: ProductRoutes,
  },
  {
    path: '/cart',
    route: CartRoutes,
  },
  {
    path: '/profile',
    route: ProfileRoutes,
  },
];

moduleRoutes.forEach((route) => router.use(route.path, route.route));
export default router;
