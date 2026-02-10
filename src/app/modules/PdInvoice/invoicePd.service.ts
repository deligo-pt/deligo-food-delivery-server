/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from 'axios';
import httpStatus from 'http-status';
import { Order } from '../Order/order.model';
import AppError from '../../errors/AppError';
import config from '../../config';
import { getPdAccessToken } from './getPdAccessToken';

// getInvoicePdfFromPd
const getInvoicePdfFromPd = async (orderId: string) => {
  try {
    const order = await Order.findOne({ orderId });

    if (!order || !order.invoiceSync?.invoiceNo) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'Order not found or invoice number is missing.',
      );
    }

    const fullNo = order.invoiceSync.invoiceNo; // e.g., "FS A/19"
    const parts = fullNo.split(' '); // ["FS", "A/19"]
    const transDocument = parts[0]; // "FS"
    const [transSerial, transDocNumber] = parts[1].split('/'); // "A", "19"

    const url = `${config.pastaDigital.api_url}/documents/pdf`;

    const response = await axios.post(url, {
      params: {
        TransDocument: transDocument, // "FS"
        TransSerial: transSerial, // "A"
        TransDocNumber: transDocNumber, // "19"
        copies: 1,
      },
      headers: {
        Authorization: `Bearer ${await getPdAccessToken()}`,
        Accept: 'application/json',
      },
    });

    console.log({ response });

    if (response.data && response.data.PDF) {
      return response.data.PDF;
    }

    return response.data;
  } catch (error: any) {
    console.error('PDF Fetch Error URL:', error.config?.url);
    console.error('PDF Fetch Error Params:', error.config?.params);
    throw error;
  }
};

export const InvoicePdService = {
  getInvoicePdfFromPd,
};
