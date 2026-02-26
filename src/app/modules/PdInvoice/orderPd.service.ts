import axios from 'axios';
import { getPdAccessToken } from './getPdAccessToken';
import config from '../../config';
import { Order } from '../Order/order.model';
import { TOrder } from '../Order/order.interface';
import { roundTo2 } from '../../utils/mathProvider';

/* eslint-disable @typescript-eslint/no-explicit-any */
const mapOrderToPdPayload = (order: TOrder) => {
  const details = order.items.flatMap((item: any) => {
    let productRef = item.variationSku || item.sku;

    if (!productRef) {
      if (item.productId && typeof item.productId === 'object') {
        productRef = item.productId.productId || item.productId.sku;
      } else {
        productRef = item.productId;
      }
    }
    const taxRate = item.productPricing.taxRate || 0;
    const pdTaxId = taxRate === 13 ? 2 : taxRate === 23 ? 1 : 3;

    const mainItem = {
      product_reference: 'Food Items',
      description: item.name,
      quantity: Number(item.itemSummary.quantity),
      price: roundTo2(item.productPricing.unitPrice),
      tax_id: pdTaxId,
    };

    let addons: any[] = [];
    if (item.addons && item.addons.length > 0) {
      addons = (item.addons || []).map((addon: any) => ({
        product_reference: 'Add Ons',
        description: addon.name,
        quantity: Number(addon.quantity),
        price: roundTo2(addon.unitPrice),
        tax_id: pdTaxId,
      }));
    }

    return [mainItem, ...addons];
  });

  if ((order.delivery.charge ?? 0) > 0) {
    const deliveryGrossPrice = order.delivery.charge;
    details.push({
      product_reference: 'DELIVERY',
      quantity: 1,
      price: roundTo2(deliveryGrossPrice),
      tax_id: 1,
    });
  }

  const paymentMethodId =
    order.paymentMethod === 'MB_WAY'
      ? 5
      : order.paymentMethod === 'CARD'
        ? 3
        : 1;

  const payments = [
    {
      amount: roundTo2(order.payoutSummary.grandTotal || 0),
      payment_method_id: paymentMethodId,
    },
  ];

  return {
    customer_id: 5,
    terminal_id: 1,
    transaction_document: 'FS',
    transaction_serial: 'A',
    tax_included: false,
    details: details,
    payments: payments,
  };
};
// syncOrderWithPd
const syncOrderWithPd = async (orderId: string) => {
  const order = await Order.findById(orderId).populate('items.productId');

  if (!order || order.invoiceSync?.isSynced) return;

  try {
    const pdToken = await getPdAccessToken();
    const payload = mapOrderToPdPayload(order);

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
