import { Router } from 'express';
import auth from '../../middlewares/auth';
import { WalletControllers } from './wallet.controller';

const router = Router();

// get all wallets
router.get(
  '/',
  auth('ADMIN', 'SUPER_ADMIN', 'FLEET_MANAGER'),
  WalletControllers.getAllWallets,
);

// get my wallet
router.get(
  '/me',
  auth(
    'ADMIN',
    'SUPER_ADMIN',
    'FLEET_MANAGER',
    'VENDOR',
    'SUB_VENDOR',
    'DELIVERY_PARTNER',
  ),
  WalletControllers.getMyWallet,
);

// get single wallet
router.get(
  '/:walletId',
  auth('ADMIN', 'SUPER_ADMIN', 'FLEET_MANAGER'),
  WalletControllers.getSingleWallet,
);

export const WalletRoutes = router;
