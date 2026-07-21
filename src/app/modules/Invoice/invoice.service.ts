/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from 'axios';
import config from '../../config';
import { getPdAccessToken } from './getPdAccessToken';
import { Order } from '../Order/order.model';
import AppError from '../../errors/AppError';
import httpStatus from 'http-status';
import puppeteer from 'puppeteer';
import Handlebars from '../../config/handlebars';
import { calculateVatBreakdown, INVOICE_PDF_TEMPLATE } from './invoice.utils';

const downloadOrderInvoicePdf = async (orderId: string) => {
  const order = await Order.findOne({ orderId });

  if (!order || !order.invoiceSync?.isSynced || !order.invoiceSync.invoiceNo) {
    throw new Error('Invoice is not synced yet with Pasta Digital.');
  }

  try {
    const pdToken = await getPdAccessToken();

    const fullInvoiceNo = order.invoiceSync.invoiceNo;
    const [docType, rest] = fullInvoiceNo.split(' ');
    const [serial, number] = rest.split('/');

    const response = await axios.get(
      `${config.pastaDigital.api_url}/sales/pdf`,
      {
        params: {
          document: docType,
          serial: serial,
          number: number,
        },
        headers: {
          Authorization: `Bearer ${pdToken}`,
          Accept: 'application/json',
        },
      },
    );

    if (response.data && response.data.pdf_base64) {
      return response.data.pdf_base64;
    }

    throw new Error('PDF data not found in the API response.');
  } catch (error: any) {
    const errorDetail = error.response?.data || error.message;
    console.error('Failed to fetch PDF from Pasta Digital:', errorDetail);

    throw new Error(
      'Could not retrieve PDF invoice string from Pasta Digital.',
    );
  }
};

const generateCustomInvoicePdfBuffer = async (orderId: string) => {
  const order = await Order.findOne({ orderId }).populate({
    path: 'customerId',
    select: 'name NIF email',
  });

  if (!order) {
    throw new AppError(httpStatus.NOT_FOUND, 'ORDER_NOT_FOUND');
  }

  const customer = order.customerId as any;

  const customerName =
    customer?.name?.firstName + ' ' + customer?.name?.lastName || 'Cliente';

  const customerNif = customer?.NIF || '999999990';

  const deliveryGross = order.delivery?.totalDeliveryCharge || 0;
  const serviceBase = order.orderCalculation?.serviceCharge || 0;
  const serviceVat = order.orderCalculation?.serviceChargeVatAmount || 0;
  const serviceGross = serviceBase + serviceVat;

  const delivery = calculateVatBreakdown(deliveryGross);
  const service = calculateVatBreakdown(serviceGross);

  const contextData = {
    invoiceNo: order.invoiceSync?.invoiceNo || 'FS Rascunho',
    atcud: order.invoiceSync?.atcud || '-',
    dateStr: order.createdAt
      ? new Date(order.createdAt).toLocaleDateString('pt-PT')
      : new Date().toLocaleDateString('pt-PT'),
    orderId: order.orderId || order._id.toString(),
    customerName,
    cleanNif: customerNif,

    providerName: 'Pixel Miracle Lda (DeliGo)',
    providerAddress: 'Rua Joaquim Agostinho 16C, 1750-126 Lisbon, Portugal',
    providerRegCode: '518758176',
    providerVat: 'PT518758176',

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

  const compiledHtml = Handlebars.compile(INVOICE_PDF_TEMPLATE)(contextData);

  let browser;
  let page;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu',
        '--disable-extensions',
        '--disable-file-system',
      ],
    });

    page = await browser.newPage();

    await page.setJavaScriptEnabled(false);

    await page.setContent(compiledHtml, { waitUntil: 'networkidle0' });

    const pdfBuffer: Uint8Array = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0px', bottom: '0px', left: '0px', right: '0px' },
    });

    await page.close();
    await browser.close();

    return {
      pdfBuffer,
      customOrderId: contextData.orderId,
    };
  } catch (error) {
    if (page) {
      try {
        await page.close();
      } catch (_) {
        // Page already closed or non-existent, ignoring error safely
      }
    }
    if (browser) {
      try {
        await browser.close();
      } catch (_) {
        // Browser already closed, ignoring safely
      }
    }

    console.error('Puppeteer Live Execution Failed:', error);

    const cleanError = new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'PDF_GENERATION_FAILED',
    );

    delete (cleanError as any).stack;
    delete (cleanError as any).err;
    delete (cleanError as any).errorSources;

    throw cleanError;
  }
};

export const InvoiceService = {
  downloadOrderInvoicePdf,
  generateCustomInvoicePdfBuffer,
};
