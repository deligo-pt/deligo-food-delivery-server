/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from 'axios';
import { getPdAccessToken } from './getPdAccessToken';
import config from '../../config';
import { Order } from '../Order/order.model';
import { roundTo2 } from '../../utils/mathProvider';
import { TLanguageCode } from '../../constant/GlobalInterface/language.interface';

const mapOrderToPdPayload = (order: any, lang: TLanguageCode = 'en') => {
  const details: any[] = [];

  // Base Prices (Excluding TAX/VAT)
  const serviceChargeBase = Number(order.orderCalculation?.serviceCharge || 0);
  const serviceChargeVat = Number(
    order.orderCalculation?.serviceChargeVatAmount || 0,
  ); // 0.23
  const totalServiceCharge = roundTo2(serviceChargeBase + serviceChargeVat);

  if (serviceChargeBase > 0) {
    const serviceChargeVatRate =
      order.orderCalculation?.serviceChargeVatRate || 23;
    const scTaxId =
      serviceChargeVatRate === 13 ? 2 : serviceChargeVatRate === 23 ? 1 : 3;

    details.push({
      product_reference: 'TAXA_SERVICO',
      description: lang === 'pt' ? 'Taxa de serviço' : 'Service Charge',
      quantity: 1,
      price: roundTo2(serviceChargeBase),
      tax_id: scTaxId,
    });
  }

  const deliveryBasePrice = Number(order.delivery?.charge || 0);
  const totalDeliveryCharge = Number(order.delivery?.totalDeliveryCharge || 0);

  if (deliveryBasePrice > 0) {
    const deliveryTaxRate = order.delivery.taxRate || 23;
    const deliveryTaxId =
      deliveryTaxRate === 13 ? 2 : deliveryTaxRate === 23 ? 1 : 3;

    details.push({
      product_reference: 'TAXA_ENTREGA',
      description: lang === 'pt' ? 'Taxa de entrega' : 'Delivery Fee',
      quantity: 1,
      price: roundTo2(deliveryBasePrice),
      tax_id: deliveryTaxId,
    });
  }

  const platformInvoiceTotal = roundTo2(
    totalServiceCharge + totalDeliveryCharge,
  );

  const paymentMethodId =
    order.paymentMethod === 'MB_WAY'
      ? 5
      : order.paymentMethod === 'CARD' ||
          order.paymentMethod === 'GOOGLE_PAY' ||
          order.paymentMethod === 'APPLE_PAY'
        ? 3
        : 3;

  const payments = [
    {
      value: platformInvoiceTotal,
      amount: platformInvoiceTotal,
      payment_method_id: paymentMethodId,
    },
  ];

  let targetCustomerName = 'Consumidor Final';
  let targetCustomerVat = '999999990';

  if (order.customerId && typeof order.customerId === 'object') {
    if (order.customerId.name && typeof order.customerId.name === 'object') {
      const fName = order.customerId.name.firstName || '';
      const lName = order.customerId.name.lastName || '';
      targetCustomerName = `${fName} ${lName}`.trim() || 'Consumidor Final';
    }

    const rawNif = order.customerId.NIF || order.customerId.nif || '';
    if (rawNif) {
      targetCustomerVat = rawNif.replace(/^PT/i, '').trim();
    }
  } else if (order.deliveryAddress && order.deliveryAddress.label) {
    targetCustomerName = order.deliveryAddress.label;
  }

  const targetCustomerEmail =
    order.customerId?.email || order.customerEmail || '';

  const clientPayload = {
    name: targetCustomerName,
    vat_number: targetCustomerVat,
    address: order.deliveryAddress?.street || 'Portugal',
    postal_code: order.deliveryAddress?.postalCode || '',
    city: order.deliveryAddress?.city || '',
    country: 'PT',
  };

  return {
    customer_id: 5,
    terminal_id: 1,
    customer_name: targetCustomerName,
    customer_vat: targetCustomerVat,
    customer_email: targetCustomerEmail,
    customer_address: order.deliveryAddress?.street || 'Portugal',
    customer_postal_code: order.deliveryAddress?.postalCode || '',

    client: clientPayload,
    customer: clientPayload,

    transaction_document: 'FS',
    transaction_serial: 'A',
    tax_included: false,
    details: details,
    payments: payments,
    send_email: !!targetCustomerEmail,
    email: targetCustomerEmail,
  };
};

// syncOrderWithPd
const syncOrderWithPd = async (orderId: string, lang: TLanguageCode = 'en') => {
  const order = await Order.findById(orderId).populate({
    path: 'customerId',
    select: 'name NIF email',
  });

  if (!order || order.invoiceSync?.isSynced) return;

  try {
    const pdToken = await getPdAccessToken();
    const payload = mapOrderToPdPayload(order, lang);

    const response = await axios.post(
      `${config.pastaDigital.api_url}/sales`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${pdToken}`,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
      },
    );

    const {
      transaction_document,
      transaction_serial,
      transaction_document_number,
      atcud,
      signature,
    } = response.data.data;
    const invoiceNo = `${transaction_document} ${transaction_serial}/${transaction_document_number}`;

    await Order.findByIdAndUpdate(orderId, {
      $set: {
        invoiceSync: {
          isSynced: true,
          invoiceNo: invoiceNo,
          atcud: atcud,
          signature: signature,
          syncedAt: new Date(),
          syncError: null,
        },
      },
    });
  } catch (error: any) {
    const errorDetail = error.response?.data || error.message;
    console.error('Pasta Digital Sync Failed:', errorDetail);

    await Order.findByIdAndUpdate(orderId, {
      $set: {
        invoiceSync: {
          isSynced: false,
          syncError: JSON.stringify(errorDetail),
          syncedAt: new Date(),
        },
      },
    });
  }
};

export const OrderPdService = {
  syncOrderWithPd,
};
