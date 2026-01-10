/* eslint-disable @typescript-eslint/no-explicit-any */

import axios from 'axios';

import config from '../../config';

import { MoloniCustomerData } from './moloni.interface';

import { redis } from '../../utils/redis';
import { TOrder } from '../Order/order.interface';

const MOLONI_TAX_IDS: Record<number, number> = {
  23: 3742293, // IVA Normal
  6: 3742298,  // IVA Reduzido
  13: 3742303, // IVA Intermédio
};

export class MoloniService {
  private static baseUrl = 'https://api.moloni.pt/v1';

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

      const customerVat = data.NIF && data.NIF.trim() !== "" ? data.NIF : '999999990';
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


  static async createInvoice(order: TOrder, moloniCustomerId: number) {
    try {
      const token = await this.getAccessToken();
      const params = new URLSearchParams();

      params.append('company_id', String(config.moloni.company_id));
      params.append('customer_id', String(moloniCustomerId));
      params.append('document_set_id', String(config.moloni.document_set_id));
      params.append('date', new Date().toISOString().split('T')[0]);
      params.append('expiration_date', new Date().toISOString().split('T')[0]);
      params.append('status', '0');

      let productIndex = 0;


      order.items.forEach((item: any) => {
        params.append(`products[${productIndex}][product_id]`, '0');
        params.append(`products[${productIndex}][name]`, `${item.name} (${item.variantName})`);
        params.append(`products[${productIndex}][qty]`, String(item.quantity));
        params.append(`products[${productIndex}][price]`, String(item.price));

        const taxId = MOLONI_TAX_IDS[item.taxRate];

        if (taxId) {
          params.append(`products[${productIndex}][taxes][0][tax_id]`, String(taxId));
          params.append(`products[${productIndex}][taxes][0][value]`, String(item.taxRate));
          params.append(`products[${productIndex}][taxes][0][cumulative]`, '0');
        } else {

          params.append(`products[${productIndex}][exemption_reason]`, 'M01');
        }

        productIndex++;


        if (item.addons && item.addons.length > 0) {
          item.addons.forEach((addon: any) => {
            params.append(`products[${productIndex}][product_id]`, '0');
            params.append(`products[${productIndex}][name]`, `Addon: ${addon.name}`);
            params.append(`products[${productIndex}][qty]`, String(addon.quantity * item.quantity));
            params.append(`products[${productIndex}][price]`, String(addon.price));


            if (taxId) {
              params.append(`products[${productIndex}][taxes][0][tax_id]`, String(taxId));
              params.append(`products[${productIndex}][taxes][0][value]`, String(item.taxRate));
            } else {
              params.append(`products[${productIndex}][exemption_reason]`, 'M01');
            }
            productIndex++;
          });
        }
      });


      if (typeof order.deliveryCharge === 'number' && order.deliveryCharge > 0) {
        params.append(`products[${productIndex}][product_id]`, '0');
        params.append(`products[${productIndex}][name]`, 'Delivery Charge');
        params.append(`products[${productIndex}][qty]`, '1');
        params.append(`products[${productIndex}][price]`, String(order.deliveryCharge));
        params.append(`products[${productIndex}][exemption_reason]`, 'M01');
      }

      const url = `${this.baseUrl}/invoices/insert/?access_token=${token}`;
      const response = await axios.post(url, params.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });

      if (response.data && response.data.document_id) {
        console.log('Invoice Created Successfully:', response.data.document_id);
        return response.data.document_id;
      }

      console.error('Invoice Creation Warning:', response.data);
      return null;
    } catch (error: any) {
      console.error('Invoice Critical Error:', error.response?.data || error.message);
      return null;
    }
  }


}
