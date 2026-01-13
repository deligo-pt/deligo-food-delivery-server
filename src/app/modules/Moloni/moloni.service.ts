/* eslint-disable @typescript-eslint/no-explicit-any */

import qs from 'qs';

import axios from 'axios';

import config from '../../config';

import { MoloniCustomerData } from './moloni.interface';

import { redis } from '../../utils/redis';

const MOLONI_TAX_IDS: Record<number, number> = {
  23: 3741590, // IVA Normal
  6: 3741595, // IVA Reduzido
  13: 3741600, // IVA Intermédio
};

export class MoloniService {
  private static baseUrl = config.moloni.base_url;

  private static REDIS_KEY = 'moloni_access_token';

  // Get moloni access token from redis
  private static async getAccessToken(): Promise<string> {
    const cachedToken = await redis.get<string>(this.REDIS_KEY);

    if (cachedToken) {
      return cachedToken;
    }

    try {
      const res = await axios.get(`${this.baseUrl}/grant/`, {
        params: {
          grant_type: 'password',

          client_id: config.moloni.client_id,

          client_secret: config.moloni.client_secret,

          username: config.moloni.username,

          password: config.moloni.password,
        },
        timeout: 30000,
      });

      const token = res.data.access_token;

      const expiresIn = res.data.expires_in || 3600;

      await redis.set(this.REDIS_KEY, token, { ex: expiresIn - 600 }); // 10 minutes before expiration

      return token;
    } catch (error: any) {
      throw new Error(`Moloni Auth Failed: ${error.message}`);
    }
  }

  // Create a new customer in moloni
  static async createCustomer(
    data: MoloniCustomerData
  ): Promise<number | null> {
    try {
      const token = await this.getAccessToken();

      const customerVat =
        data.NIF && data.NIF.trim() !== '' ? data.NIF : '999999990';
      const params = new URLSearchParams();

      params.append('company_id', String(config.moloni.company_id));

      params.append('vat', customerVat);

      params.append('number', String(data.customerId));

      params.append('name', data.name);

      params.append('email', data.email || '');

      params.append('language_id', '1');

      params.append('country_id', '1');

      params.append('address', data.address || 'No Address Provided');

      params.append('zip_code', data.zipCode || '1000-001');

      params.append('city', data.city || 'Lisbon');

      const defaults = {
        maturity_date_id: '0',

        delivery_method_id: '0',

        payment_method_id: '0',

        salesman_id: '0',

        payment_day: '0',

        discount: '0',

        credit_limit: '0',
      };

      Object.entries(defaults).forEach(([key, val]) => params.append(key, val));

      const url = `${this.baseUrl}/customers/insert/?access_token=${token}`;

      const response = await axios.post(url, params, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });

      if (response.data && response.data.customer_id) {
        return response.data.customer_id;
      }

      console.error('Moloni Sync Warning:', JSON.stringify(response.data));

      return null;
    } catch (error: any) {
      console.error('Moloni Sync Critical Error:', error.message);

      return null;
    }
  }

  // update customer in moloni
  static async updateCustomer(
    moloniCustomerId: number,
    data: MoloniCustomerData
  ) {
    try {
      const token = await this.getAccessToken();
      const params = new URLSearchParams();
      params.append('company_id', String(config.moloni.company_id));
      params.append('customer_id', String(moloniCustomerId));

      params.append('name', data.name);
      if (data.email) params.append('email', data.email);
      if (data.contactNumber)
        params.append('contact_number', data.contactNumber);
      if (data.address) params.append('address', data.address);
      if (data.zipCode) params.append('zip_code', data.zipCode);
      if (data.city) params.append('city', data.city);

      const url = `${this.baseUrl}/customers/update/?access_token=${token}`;
      const response = await axios.post(url, params, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });
      if (response.data && response.data.customer_id) {
        return response.data.customer_id;
      }
      console.error('Moloni Sync Warning:', JSON.stringify(response.data));
      return false;
    } catch (error: any) {
      console.error('Moloni Sync Critical Error:', error.message);
      return false;
    }
  }

  static async createInvoice(order: any, moloniCustomerId: number) {
    try {
      const token = await this.getAccessToken();

      const invoiceData: any = {
        company_id: Number(config.moloni.company_id),
        date: new Date().toISOString().split('T')[0],
        expiration_date: new Date().toISOString().split('T')[0],
        document_set_id: Number(config.moloni.document_set_id),
        customer_id: Number(moloniCustomerId),
        status: 0,
        products: [],
        associated_documents: [],
      };

      let productIndex = 0;

      order.items.forEach((item: any) => {
        const taxId = MOLONI_TAX_IDS[item.taxRate];

        const product: any = {
          product_id: 0,
          name: `${item.name} (${item.variantName})`,
          summary: '',
          qty: Number(item.quantity),
          price: Number(item.price),
          discount: 0,
          order: productIndex++,
        };

        if (taxId) {
          product.taxes = [
            {
              tax_id: Number(taxId),
              value: Number(item.taxRate),
              order: 1,
              cumulative: 0,
            },
          ];
        } else {
          product.exemption_reason = 'M01';
        }

        invoiceData.products.push(product);

        if (item.addons && item.addons.length > 0) {
          for (const addon of item.addons) {
            const addonProduct: any = {
              product_id: 0,
              name: `Addon: ${addon.name}`,
              summary: '',
              qty: Number(addon.quantity * item.quantity),
              price: Number(addon.price),
              discount: 0,
              order: productIndex++,
            };

            if (taxId) {
              (addonProduct as any).taxes = [
                {
                  tax_id: Number(taxId),
                  value: Number(item.taxRate),
                  order: 1,
                  cumulative: 0,
                },
              ];
            } else {
              addonProduct.exemption_reason = 'M01';
            }
            invoiceData.products.push(addonProduct);
          }
        }
      });

      if (Number(order.deliveryCharge) > 0) {
        invoiceData.products.push({
          product_id: 0,
          name: 'Delivery Charge',
          summary: '',
          qty: 1,
          price: Number(Number(order.deliveryCharge).toFixed(2)),
          discount: 0,
          order: productIndex++,
          exemption_reason: 'M01',
        });
      }

      const body = qs.stringify(invoiceData, {
        arrayFormat: 'indices',
        encode: false,
      });

      const url = `${this.baseUrl}/invoices/insert/?access_token=${token}`;
      const response = await axios.post(url, body, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: 15000,
      });

      if (response.data && response.data.document_id) {
        console.log('Success! Invoice ID:', response.data.document_id);
        return response.data.document_id;
      }

      console.error('Moloni Error Detail:', JSON.stringify(response.data));
      return null;
    } catch (error: any) {
      console.error('Critical Error:', error.response?.data || error.message);
      return null;
    }
  }
}
