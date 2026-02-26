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

export const WalletRoutes = router;
