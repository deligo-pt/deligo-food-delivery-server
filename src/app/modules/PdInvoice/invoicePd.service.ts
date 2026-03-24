/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from 'axios';
import { getPdAccessToken } from './getPdAccessToken';
import config from '../../config';
import { Order } from '../Order/order.model';

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

export const InvoicePdService = {
  downloadOrderInvoicePdf,
};
