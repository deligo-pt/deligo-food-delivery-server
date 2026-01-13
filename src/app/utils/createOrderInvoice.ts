/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from 'axios';
import config from '../config';

// Moloni API এর জন্য ইন্টারফেস
interface MoloniTax {
  tax_id: number;
  value: number;
}

interface MoloniProduct {
  product_id: number;
  name: string;
  qty: number;
  price: number;
  exemption_reason?: string;
  taxes?: MoloniTax[];
}

interface OrderItem {
  name: string;
  variantName: string;
  price: number;
  quantity: number;
  taxRate: number;
  addons: Array<{ name: string; price: number; quantity: number }>;
}

/**
 * Moloni Access Token জেনারেট করার ফাংশন
 */
async function getMoloniAccessToken(): Promise<string | null> {
  try {
    const response = await axios.get('https://api.moloni.pt/v1/grant/', {
      params: {
        grant_type: 'password',
        client_id: config.moloni.client_id,
        client_secret: config.moloni.client_secret,
        username: config.moloni.username,
        password: config.moloni.password,
      },
    });

    return response.data.access_token || null;
  } catch (error: any) {
    console.error(
      '❌ Moloni Auth Error:',
      error.response?.data || error.message
    );
    return null;
  }
}

/**
 * ইনভয়েস জেনারেট করার মেইন ফাংশন
 */
export async function generateMoloniInvoice(orderData: any) {
  try {
    // ১. টোকেন সংগ্রহ
    const token = await getMoloniAccessToken();
    if (!token) {
      throw new Error('Could not retrieve access token from Moloni.');
    }

    console.log('🔑 New Token Generated:', token);

    // ২. কনফিগারেশন ভেরিয়েবল
    const COMPANY_ID = 374025;
    const CUSTOMER_ID = 141201448;
    const DOCUMENT_SET_ID = 907888;
    const DEFAULT_TAX_ID = 3742298;

    const products: MoloniProduct[] = [];

    // ৩. আইটেম এবং অ্যাড-অনস লজিক
    orderData.items.forEach((item: OrderItem) => {
      // মেইন প্রোডাক্ট
      products.push({
        product_id: 0,
        name: `${item.name} (${item.variantName})`,
        qty: item.quantity,
        price: item.price,
        taxes: [
          {
            tax_id: DEFAULT_TAX_ID,
            value: item.taxRate,
          },
        ],
      });

      // অ্যাড-অনস প্রসেসিং
      if (item.addons && item.addons.length > 0) {
        item.addons.forEach((addon) => {
          products.push({
            product_id: 0,
            name: `>> Add-on: ${addon.name}`,
            qty: addon.quantity * item.quantity,
            price: addon.price,
            taxes: [{ tax_id: DEFAULT_TAX_ID, value: item.taxRate }],
          });
        });
      }
    });

    // ৪. ডেলিভারি চার্জ যোগ করা
    if (orderData.deliveryCharge > 0) {
      products.push({
        product_id: 0,
        name: 'Delivery Charge',
        qty: 1,
        price: orderData.deliveryCharge,
        taxes: [],
      });
    }

    // ৫. ইনভয়েস পেলোড
    const invoicePayload = {
      company_id: COMPANY_ID,
      customer_id: CUSTOMER_ID,
      date: new Date().toISOString().split('T')[0],
      expiration_date: new Date().toISOString().split('T')[0],
      document_set_id: DOCUMENT_SET_ID,
      products: products,
      status: 0, // Draft মোডে রাখা হয়েছে
      payment_method_id: orderData.paymentMethod === 'CARD' ? 1 : 2,
      notes: `Order ID: ${orderData.orderId} | Transaction: ${orderData.transactionId}`,
      our_reference: orderData.orderId,
    };

    // ৬. Moloni API-তে পোস্ট রিকোয়েস্ট
    const response = await axios.post(
      'https://api.moloni.pt/v1/invoices/insert/',
      invoicePayload,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('✅ Invoice Created Successfully!');
    console.log('Document ID:', response.data.document_id);
    return response.data;
  } catch (error: any) {
    console.error('❌ Error creating Moloni invoice:');
    if (error.response) {
      console.error(JSON.stringify(error.response.data, null, 2));
    } else {
      console.error(error.message);
    }
  }
}

// --- টেস্ট রান ---
const inputData = {
  orderId: 'ORD-1768229316103-5083',
  items: [
    {
      name: 'Spicy Chicken Peri-Peri Pizza',
      variantName: 'Medium',
      addons: [{ name: 'Cheddar Cheese', price: 1.2, quantity: 1 }],
      quantity: 30,
      price: 12.75,
      taxRate: 6,
    },
  ],
  deliveryCharge: 5401.95,
  paymentMethod: 'CARD',
  transactionId: 'pi_3SomPWP0xY0uRyP00jt6eXyU',
};

generateMoloniInvoice(inputData);
