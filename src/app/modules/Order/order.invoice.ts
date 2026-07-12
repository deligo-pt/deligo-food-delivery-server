/* eslint-disable @typescript-eslint/no-explicit-any */
import nodemailer from 'nodemailer';
import puppeteer from 'puppeteer';
import handlebars from 'handlebars';

/**
 * Calculates net price and VAT amount from a gross (VAT-inclusive) total
 */
const calculateVatBreakdown = (
  grossAmount: number,
  vatRateAsPercentage: number = 23,
) => {
  const divisor = 1 + vatRateAsPercentage / 100;
  const net = Number((grossAmount / divisor).toFixed(4));
  const vatAmount = Number((grossAmount - net).toFixed(4));

  return {
    net: Number(net.toFixed(2)),
    vatAmount: Number(vatAmount.toFixed(2)),
    gross: Number(grossAmount.toFixed(2)),
  };
};

const INVOICE_PDF_TEMPLATE = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <style>
      body { font-family: Arial, sans-serif; color: #333; margin: 0; padding: 40px; font-size: 12px; line-height: 1.4; }
      .header { display: flex; justify-content: space-between; margin-bottom: 20px; }
      .brand { color: #10B981; font-size: 20px; font-weight: bold; margin-bottom: 5px; }
      .company-details, .invoice-meta { font-size: 10px; color: #555; }
      .invoice-meta { text-align: right; }
      .invoice-title { font-size: 14px; font-weight: bold; color: #111; margin-bottom: 5px; }
      .divider { border-bottom: 1px solid #E5E7EB; margin: 20px 0; }
      .entity-block { font-size: 11px; margin-bottom: 30px; }
      .entity-title { font-weight: bold; color: #111; margin-bottom: 5px; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
      th { background-color: #F3F4F6; color: #374151; font-weight: bold; text-align: left; padding: 10px 8px; font-size: 11px; }
      td { padding: 12px 8px; border-bottom: 1px solid #E5E7EB; color: #4B5563; }
      .text-right { text-align: right; }
      .totals-container { width: 100%; display: flex; justify-content: flex-end; margin-top: 10px; }
      .totals-table { width: 40%; border-collapse: collapse; }
      .totals-table td { border-bottom: none; padding: 6px 8px; }
      .grand-total { background-color: #ECFDF5; color: #065F46; font-weight: bold; }
      .footer { position: fixed; bottom: 30px; left: 40px; right: 40px; text-align: center; color: #9CA3AF; font-size: 9px; line-height: 1.5; }
    </style>
  </head>
  <body>
    <div class="header">
      <div class="company-details">
        <div class="brand">DELI GO</div>
        <div>Courier Services Portugal, Lda.</div>
        <div>Avenida da Liberdade 100, 1250-145 Lisboa</div>
        <div>NIF: PT500123456 | Capital Social: €50.000</div>
      </div>
      <div class="invoice-meta">
        <div class="invoice-title">FATURA / INVOICE</div>
        <div><strong>Nº:</strong> {{invoiceNo}}</div>
        <div><strong>ATCUD:</strong> {{atcud}}</div>
        <div><strong>Data:</strong> {{dateStr}}</div>
        <div><strong>Ref Pedido:</strong> {{orderId}}</div>
      </div>
    </div>

    <div class="divider"></div>

    <div class="entity-block">
      <div class="entity-title">Emitido para / Client:</div>
      <div><strong>Nome:</strong> {{customerName}}</div>
      <div><strong>NIF:</strong> {{cleanNif}}</div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Descrição / Description</th>
          <th class="text-right">Base Excl.</th>
          <th class="text-right">IVA</th>
          <th class="text-right">Val. IVA</th>
          <th class="text-right">Total</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Taxa de Entrega / Delivery Fee</td>
          <td class="text-right">€{{delivery.net}}</td>
          <td class="text-right">23%</td>
          <td class="text-right">€{{delivery.vatAmount}}</td>
          <td class="text-right">€{{delivery.gross}}</td>
        </tr>
        <tr>
          <td>Taxa de Serviço / Service Fee</td>
          <td class="text-right">€{{service.net}}</td>
          <td class="text-right">23%</td>
          <td class="text-right">€{{service.vatAmount}}</td>
          <td class="text-right">€{{service.gross}}</td>
        </tr>
      </tbody>
    </table>

    <div class="totals-container">
      <table class="totals-table">
        <tr>
          <td>Total Líquido / Excl. VAT:</td>
          <td class="text-right">€{{totalNet}}</td>
        </tr>
        <tr>
          <td>Total IVA (23%):</td>
          <td class="text-right">€{{totalVat}}</td>
        </tr>
        <tr class="grand-total">
          <td><strong>Total Pago / Grand Total:</strong></td>
          <td class="text-right"><strong>€{{grandTotal}}</strong></td>
        </tr>
      </table>
    </div>

    <div class="footer">
      Processado por computador. Os bens/serviços foram colocados à disposição do adquirente na data do documento.<br>
      Esta fatura serve apenas para os serviços de entrega cobrados pela plataforma.
    </div>
  </body>
  </html>
`;

const buildHtmlEmailTemplate = (
  order: any,
  customerName: string,
  deliveryGross: number,
  serviceGross: number,
): string => {
  const dateStr = order.createdAt?.$date
    ? new Date(order.createdAt.$date).toLocaleDateString('pt-PT')
    : new Date().toLocaleDateString('pt-PT');
  const grandTotal = (deliveryGross + serviceGross).toFixed(2);

  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="margin: 0; padding: 0; background-color: #F3F4F6; font-family: -apple-system, BlinkMacSystemFont, sans-serif;">
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #F3F4F6; padding: 40px 10px;">
        <tr>
          <td align="center">
            <table width="100%" style="max-width: 500px; background-color: #111827; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.15); border-collapse: collapse;">
              <tr>
                <td style="background-color: #059669; padding: 32px 24px; text-align: center;">
                  <h1 style="margin: 0; color: #FFFFFF; font-size: 24px; font-weight: 700;">Obrigado pelo seu pedido!</h1>
                  <p style="margin: 4px 0 0 0; color: #D1FAE5; font-size: 14px;">Olá, ${customerName}</p>
                </td>
              </tr>
              <tr>
                <td style="padding: 24px;">
                  <p style="margin: 0 0 20px 0; color: #9CA3AF; font-size: 13px; text-align: center;">Pedido: ${order.orderId} • ${dateStr}</p>
                  <table width="100%" style="border-collapse: collapse; margin-bottom: 24px;">
                    <tr>
                      <td style="padding: 12px 0; color: #E5E7EB; font-size: 14px;">Taxa de Entrega (IVA incl.)</td>
                      <td align="right" style="padding: 12px 0; color: #E5E7EB; font-size: 14px; font-weight: 600;">€${deliveryGross.toFixed(2)}</td>
                    </tr>
                    <tr>
                      <td style="padding: 12px 0; color: #E5E7EB; font-size: 14px; border-bottom: 1px solid #374151;">Taxa de Serviço (IVA incl.)</td>
                      <td align="right" style="padding: 12px 0; color: #E5E7EB; font-size: 14px; font-weight: 600; border-bottom: 1px solid #374151;">€${serviceGross.toFixed(2)}</td>
                    </tr>
                    <tr>
                      <td style="padding: 16px 0 0 0; color: #34D399; font-size: 16px; font-weight: 700;">Subtotal Cobrado (Plataforma)</td>
                      <td align="right" style="padding: 16px 0 0 0; color: #34D399; font-size: 18px; font-weight: 700;">€${grandTotal}</td>
                    </tr>
                  </table>
                  <p style="margin: 0; padding: 12px; background-color: #1F2937; border-radius: 8px; color: #9CA3AF; font-size: 12px; text-align: center; line-height: 1.4;">
                    📄 A sua fatura legal referente às taxas da plataforma encontra-se anexada a este email.
                  </p>
                </td>
              </tr>
              <tr>
                <td style="background-color: #1F2937; padding: 20px 24px; text-align: center; border-top: 1px solid #374151;">
                  <p style="margin: 0; color: #9CA3AF; font-size: 11px; line-height: 1.5; text-align: left;">
                    <strong>Nota Importante:</strong> O pagamento total deste pedido foi de €${order.payoutSummary?.grandTotal?.toFixed(2) || '0.00'} (${order.paymentMethod || 'Card'}). Se necessitar de uma fatura para os itens alimentares/restauração (no valor de €${order.orderCalculation?.itemsSubtotal?.toFixed(2) || '0.00'}), por favor solicite-a diretamente ao estabelecimento seller.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
};

export const sendInvoiceEmailWithAttachment = async (
  order: any,
  targetEmail: string,
): Promise<void> => {
  let browser;
  try {
    const deliveryGross = order.delivery?.totalDeliveryCharge || 0;

    // Service Charge Gross = base charge + vat amount (1 + 0.23 = 1.23)
    const serviceBase = order.orderCalculation?.serviceCharge || 0;
    const serviceVat = order.orderCalculation?.serviceChargeVatAmount || 0;
    const serviceGross = serviceBase + serviceVat;

    const delivery = calculateVatBreakdown(deliveryGross);
    const service = calculateVatBreakdown(serviceGross);

    const customerName = order.customerName || 'Cliente';
    const rawNif = order.customerNif || '999999990';
    const cleanNif = rawNif.trim().toUpperCase().startsWith('PT')
      ? rawNif.trim().substring(2)
      : rawNif;

    const contextData = {
      invoiceNo: order.invoiceSync?.invoiceNo || 'FS Rascunho',
      atcud: order.invoiceSync?.atcud || '-',
      dateStr: order.createdAt?.$date
        ? new Date(order.createdAt.$date).toLocaleDateString('pt-PT')
        : new Date().toLocaleDateString('pt-PT'),
      orderId: order.orderId || order._id.toString(),
      customerName,
      cleanNif,
      delivery: {
        net: delivery.net.toFixed(2),
        vatAmount: delivery.vatAmount.toFixed(2),
        gross: delivery.gross.toFixed(2),
      },
      service: {
        net: service.net.toFixed(2),
        vatAmount: service.vatAmount.toFixed(2),
        gross: service.gross.toFixed(2),
      },
      totalNet: (delivery.net + service.net).toFixed(2),
      totalVat: (delivery.vatAmount + service.vatAmount).toFixed(2),
      grandTotal: (deliveryGross + serviceGross).toFixed(2),
    };

    const compiledHtml = handlebars.compile(INVOICE_PDF_TEMPLATE)(contextData);

    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    await page.setContent(compiledHtml, { waitUntil: 'networkidle0' });

    const pdfBuffer: Uint8Array = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0px', bottom: '0px', left: '0px', right: '0px' },
    });

    await browser.close();
    browser = null;

    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.mailtrap.io',
      port: Number(process.env.EMAIL_PORT) || 2525,
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER || '',
        pass: process.env.EMAIL_PASS || '',
      },
    });

    const htmlBody = buildHtmlEmailTemplate(
      order,
      customerName,
      deliveryGross,
      serviceGross,
    );

    const mailOptions = {
      from: '"Deli Go" <no-reply@deligo.pt>',
      to: targetEmail,
      subject: `Fatura Simplificada ${contextData.invoiceNo} - Pedido #${contextData.orderId}`,
      html: htmlBody,
      attachments: [
        {
          filename: `Invoice_${contextData.orderId}.pdf`,
          content: Buffer.from(pdfBuffer),
          contentType: 'application/pdf',
        },
      ],
    };

    await transporter.sendMail(mailOptions);
  } catch (error) {
    if (browser) await (browser as any).close();
    console.error(`Failed executing sendInvoiceEmailWithAttachment:`, error);
    throw error;
  }
};
