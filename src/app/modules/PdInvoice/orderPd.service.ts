import axios from 'axios';
import { getPdAccessToken } from './getPdAccessToken';
import config from '../../config';
import { Order } from '../Order/order.model';

/* eslint-disable @typescript-eslint/no-explicit-any */
const mapOrderToPdPayload = (order: any) => {
  const details = order.items.flatMap((item: any) => {
    let productRef = item.variationSku || item.sku;

    if (!productRef) {
      if (item.productId && typeof item.productId === 'object') {
        productRef = item.productId.productId || item.productId.sku;
      } else {
        productRef = item.productId;
      }
    }
    const discountPercent =
      item.originalPrice > 0
        ? (item.discountAmount / item.originalPrice) * 100
        : 0;

    const mainItem = {
      product_reference: productRef,
      quantity: Number(item.quantity),
      discount_percent: Number(discountPercent || 0),
    };

    let addons: any[] = [];
    if (item.addons && item.addons.length > 0) {
      addons = (item.addons || []).map((addon: any) => ({
        product_reference: addon.sku,
        quantity: Number(addon.quantity),
      }));
    }

    return [mainItem, ...addons];
  });

  if ((order.deliveryCharge ?? 0) > 0) {
    const deliveryGrossPrice = order.deliveryCharge;
    details.push({
      product_reference: 'DELIVERY',
      quantity: 1,
      price: deliveryGrossPrice.toFixed(2),
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
      amount: Number(order.subtotal || 0).toFixed(2),
      payment_method_id: paymentMethodId,
    },
  ];
  console.log({ details, payments });

  return {
    customer_id: 5,
    terminal_id: 1,
    transaction_document: 'FS',
    transaction_serial: 'A',
    tax_included: false,
    details: details,
    // TotalPaymentDiscountAmount: Number(order.offerDiscount || 0).toFixed(2),
    discount_value: Number(order.offerDiscount || 0).toFixed(2),
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
    console.log(JSON.stringify(payload));

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

    console.log(response.data.data);

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
    console.log(`Order Synced to Pasta Digital: ${orderId}`);
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
