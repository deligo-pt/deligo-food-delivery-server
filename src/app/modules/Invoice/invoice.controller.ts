import { catchAsync } from '../../utils/catchAsync';
import { TCurrentUser } from '../../constant/GlobalInterface/user.interface';
import { InvoiceService } from './invoice.service';

const downloadInvoicePdf = catchAsync(async (req, res) => {
  const { orderId } = req.params;
  // Present only on the authenticated path (dashboard). The emailed-link path is
  // authorized by the signed `?token=` instead — see invoiceDownloadGuard.
  const currentUser = req.user as TCurrentUser | undefined;

  const { pdfBuffer, customOrderId } =
    await InvoiceService.generateCustomInvoicePdfBuffer(orderId, currentUser);

  const safeBuffer = Buffer.from(pdfBuffer.buffer || pdfBuffer);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename=Invoice_${customOrderId}.pdf`,
  );
  res.setHeader('Content-Length', safeBuffer.length);

  return res.end(safeBuffer);
});

export const InvoiceControllers = {
  downloadInvoicePdf,
};
