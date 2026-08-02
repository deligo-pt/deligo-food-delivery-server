import { NextFunction, Request, Response, Router } from 'express';
import auth from '../../middlewares/auth';
import { TUserRole } from '../../constant/GlobalConstant/user.constant';
import { verifyInvoiceAccessToken } from '../../utils/invoiceAccessToken';
import { InvoiceControllers } from './invoice.controller';

const router = Router();

// The download link is mailed straight to the customer's inbox (Gmail etc.), so it has
// to work with no login session. A signed `?token=` (see invoiceAccessToken.ts) proves the
// request came from that email link. If the token is missing/invalid, fall back to normal
// session auth + ownership checks (used by the vendor/admin dashboards).
const invoiceDownloadGuard = (...roles: TUserRole[]) => {
  const requireAuth = auth(...roles);

  return (req: Request, res: Response, next: NextFunction) => {
    if (verifyInvoiceAccessToken(req.params.orderId, req.query.token)) {
      return next();
    }
    return requireAuth(req, res, next);
  };
};

router.get(
  '/download/:orderId',
  invoiceDownloadGuard(
    'CUSTOMER',
    'VENDOR',
    'SUB_VENDOR',
    'FLEET_MANAGER',
    'DELIVERY_PARTNER',
    'ADMIN',
    'SUPER_ADMIN',
  ),
  InvoiceControllers.downloadInvoicePdf,
);

export const InvoiceRoutes = router;
