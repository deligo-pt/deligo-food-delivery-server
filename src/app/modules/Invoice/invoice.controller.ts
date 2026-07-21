import { catchAsync } from '../../utils/catchAsync';
import { InvoiceService } from './invoice.service';

const downloadInvoicePdf = catchAsync(async (req, res) => {
  const { orderId } = req.params;

  const { pdfBuffer, customOrderId } =
    await InvoiceService.generateCustomInvoicePdfBuffer(orderId);

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
