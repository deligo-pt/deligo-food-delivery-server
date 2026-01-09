/* eslint-disable @typescript-eslint/no-explicit-any */

import axios from 'axios';

import config from '../../config';

import { MoloniCustomerData } from './moloni.interface';

import generateUserId from '../../utils/generateUserId';

import { redis } from '../../utils/redis';

export class MoloniService {
  private static baseUrl = 'https://api.moloni.pt/v1';

  private static REDIS_KEY = 'moloni_access_token';

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

  static async createCustomer(
    data: MoloniCustomerData
  ): Promise<number | null> {
    try {
      const token = await this.getAccessToken();

      const customerId = generateUserId('/create-customer');

      const params = new URLSearchParams();

      params.append('company_id', String(config.moloni.company_id));

      params.append('vat', '999999990');

      params.append('number', customerId);

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

  static async updateCustomer(
    moloniCustomerId: number,
    data: MoloniCustomerData
  ) {
    try {
      const token = await this.getAccessToken();
      console.log(token);
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
}
