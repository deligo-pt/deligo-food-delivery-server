import { Router } from 'express';
import { InvoiceControllers } from './invoice.controller';

const router = Router();

router.get('/download/:orderId', InvoiceControllers.downloadInvoicePdf);

export const InvoiceRoutes = router;
