/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from 'axios';
import qs from 'qs';
import config from '../config';

const CONFIG = {
  client_id: config.moloni.client_id,
  client_secret: config.moloni.client_secret,
  username: config.moloni.username,
  password: config.moloni.password,
  company_id: config.moloni.company_id,
  document_set_id: config.moloni.document_set_id,
  customer_id: 141201448,
  product_id: 221276044,
  unit_id: 3508728,
  tax_id: 3742303,
};

async function createManualInvoice() {
  try {
    const auth = await axios.get('https://api.moloni.pt/v1/grant/', {
      params: {
        grant_type: 'password',
        client_id: CONFIG.client_id,
        client_secret: CONFIG.client_secret,
        username: CONFIG.username,
        password: CONFIG.password,
      },
    });

    const token = auth.data.access_token;

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const invoiceData = {
      company_id: CONFIG.company_id,
      date: new Date().toISOString().split('T')[0],
      expiration_date: tomorrow.toISOString().split('T')[0],
      document_set_id: CONFIG.document_set_id,
      customer_id: CONFIG.customer_id,
      status: 0,
      products: [
        {
          product_id: CONFIG.product_id,
          name: 'Test Pizza Invoice',
          qty: 1,
          price: 10.0,
          unit_id: CONFIG.unit_id,
          order: 0,
          taxes: [
            {
              tax_id: CONFIG.tax_id,
              value: 13,
              order: 1,
              cumulative: 0,
            },
          ],
        },
      ],
    };

    const body = qs.stringify(invoiceData, {
      arrayFormat: 'indices',
      encodeValuesOnly: true,
    });

    const response = await axios.post(
      `https://api.moloni.pt/v1/invoices/insert/?access_token=${token}`,
      body,
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    if (response.data && response.data.document_id) {
      console.log('Invoice ID:', response.data.document_id);
    } else {
      console.log('Failed:', JSON.stringify(response.data));
    }
  } catch (error: any) {
    console.error('Error Details:', error.response?.data || error.message);
  }
}

createManualInvoice();
