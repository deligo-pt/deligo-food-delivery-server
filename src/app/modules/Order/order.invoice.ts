/* eslint-disable @typescript-eslint/no-explicit-any */
import { EmailHelper } from '../../utils/emailSender';
import config from '../../config';
import { generateInvoiceAccessToken } from '../../utils/invoiceAccessToken';

export const sendInvoiceEmailWithAttachment = async (
  order: any,
  targetEmail: string,
): Promise<void> => {
  try {
    const deliveryGross = order.delivery?.totalDeliveryCharge || 0;
    const serviceBase = order.orderCalculation?.serviceCharge || 0;
    const serviceVat = order.orderCalculation?.serviceChargeVatAmount || 0;
    const serviceGross = serviceBase + serviceVat;

    const customer = order.customerId as any;
    const vendor = order.vendorId as any;

    const customerName =
      customer?.name?.firstName + ' ' + customer?.name?.lastName || 'Cliente';

    const vendorName =
      vendor?.businessDetails?.businessName || 'Estabelecimento Vendedor';

    const vendorAddress = vendor?.businessLocation;

    const vendorFullAddress = `${vendorAddress?.street || ''}, ${vendorAddress?.postalCode || ''} ${vendorAddress?.city || ''}`;

    const orderIdStr = order.orderId || order._id.toString();

    const dateStr = order.createdAt?.$date
      ? new Date(order.createdAt.$date).toLocaleDateString('pt-PT')
      : new Date().toLocaleDateString('pt-PT');

    const mappedItems = (order.items || []).map((item: any) => ({
      quantity: item.itemSummary?.quantity || item.quantity || 1,
      name: item.name?.en || item.name || 'Item',
      total: (
        item.itemSummary?.grandTotal ||
        item.productPricing?.lineTotal ||
        0
      ).toFixed(2),
    }));

    const addr = order.deliveryAddress;
    const fullDeliveryAddress = addr
      ? `${addr.street || ''}, ${addr.postalCode || ''} ${addr.city || ''}`
      : 'Portugal';

    const emailData = {
      customerName,
      dateStr,
      vendorName: vendorName,
      vendorAddress: vendorFullAddress,
      deliveryAddress: fullDeliveryAddress,
      items: mappedItems,
      deliveryFee: deliveryGross.toFixed(2),
      serviceFee: serviceGross.toFixed(2),
      hasDiscount: !!(
        order.offer?.isApplied || order.orderCalculation?.totalProductDiscount
      ),
      discountAmount: (
        order.orderCalculation?.totalProductDiscount || 0
      ).toFixed(2),
      grandTotal: (order.payoutSummary?.grandTotal || 0).toFixed(2),
      orderId: orderIdStr,
      currentYear: new Date().getFullYear(),
      downloadUrl: `${config.backend_base_url}/invoices/download/${orderIdStr}?token=${generateInvoiceAccessToken(orderIdStr)}`,
    };

    const htmlBody = await EmailHelper.createEmailContent(
      emailData,
      'order-invoice',
    );

    await EmailHelper.sendEmail(
      targetEmail,
      htmlBody,
      `O seu recibo do pedido #${orderIdStr}`,
      { shouldLog: false },
    );
  } catch (error) {
    void error;
    throw error;
  }
};
