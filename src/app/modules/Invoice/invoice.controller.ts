import { catchAsync } from '../../utils/catchAsync';
import { InvoiceService } from './invoice.service';

const downloadInvoicePdf = catchAsync(async (req, res) => {
  const { orderId } = req.params;

  const { pdfBuffer, customOrderId } =
    await InvoiceService.generateCustomInvoicePdfBuffer(orderId);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename=Invoice_${customOrderId}.pdf`,
  );

  res.send(Buffer.from(pdfBuffer));
});

export const InvoiceControllers = {
  downloadInvoicePdf,
};
