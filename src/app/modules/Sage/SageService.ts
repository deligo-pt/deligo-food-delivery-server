/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from 'axios';
import { TProduct } from '../Product/product.interface';
import { Order } from '../Order/order.model';
import config from '../../config';

const mapOrderToSagePayload = (order: any) => {
  const details = order.items.flatMap((item: any) => {
    const mainItem = {
      ItemID: '1',
      Description:
        `${item.name}${item.variantName ? ` (${item.variantName})` : ''}`.substring(
          0,
          100,
        ),
      Quantity: Number(item.quantity),
      UnitPrice: Number(item.price),
      TaxableGroupID: 1,
      WarehouseID: 1,
      TaxIncludedPrice: 0,
    };

    const addons = (item.addons || []).map((addon: any) => ({
      ItemID: '1',
      Description: `[Addon] ${addon.name}`.substring(0, 100),
      Quantity: Number(addon.quantity * item.quantity),
      UnitPrice: Number(addon.price),
      TaxableGroupID: 1,
      WarehouseID: 1,
      TaxIncludedPrice: 0,
    }));

    return [mainItem, ...addons];
  });

  if ((order.deliveryCharge ?? 0) > 0) {
    details.push({
      ItemID: '1',
      Description: 'Delivery Fee',
      Quantity: 1,
      UnitPrice: Number(order.deliveryCharge),
      TaxableGroupID: 1,
      WarehouseID: 1,
      TaxIncludedPrice: 0,
    });
  }

  return {
    TransSerial: '1',
    TransDocument: 'FS',
    PartyID: 1,
    TenderID: 1,
    ContractReferenceNumber: String(order.orderId).substring(0, 20),
    PaymentID: 1,
    SalesmanID: 1,
    TotalPaiedAmount: Number(order.totalAmount || 0),
    TransactionTaxIncluded: false,
    Details: details,
  };
};

// syncOrderWithSage
const syncOrderWithSage = async (orderId: string) => {
  const order = await Order.findById(orderId);

  if (!order) throw new Error('Order not found');
  if (order.sageSync?.isSynced) return;

  try {
    const payload = mapOrderToSagePayload(order);

    const response = await axios.post(
      `${process.env.SAGE_API_URL}/api/documents/sale`,
      payload,
      {
        headers: {
          accessKey: process.env.SAGE_ACCESS_KEY,
          Accept: 'application/json',
        },
      },
    );

    const { TransDocNumber, ATCUD, Signature } = response.data;

    await Order.findByIdAndUpdate(orderId, {
      'sageSync.isSynced': true,
      'sageSync.invoiceNo': TransDocNumber,
      'sageSync.atcud': ATCUD,
      'sageSync.signature': Signature,
      'sageSync.syncedAt': new Date(),
    });
  } catch (error: any) {
    const errorDetail = error.response?.data || error.message;
    console.error('Sage Sync Failed:', errorDetail);

    await Order.findByIdAndUpdate(orderId, {
      'sageSync.syncError': JSON.stringify(errorDetail),
    });
  }
};
// syncProductToSage
const syncProductToSage = async (product: TProduct) => {
  const SAGE_API_URL = `${process.env.SAGE_API_URL}/api/products`;

  const sendRequest = async (id: string, name: string, price: number) => {
    const payload = {
      ItemID: id,
      Description: name,
      ShortDescription: product.category,
      ItemType: '0',
      FamilyID: 1,
      BarCode: id,
      UnitOfSaleID: 'UNI',
      TaxableGroupID: 1,
      Price: [{ UnitPrice: price }],
      Comments: product.description || '',
      Discontinued: false,
      RestockLevel: product.stock.quantity || 10,
      SupplierID: 1,
      ItemPictureName: product.images?.[0] || '',
      BinLocation: '',
      Colors: [],
      Sizes: [],
    };

    try {
      const { data } = await axios.post(SAGE_API_URL, payload, {
        headers: {
          Accept: '*/*',
          'Content-Type': 'application/json',
          accessKey: process.env.SAGE_ACCESS_KEY,
        },
      });
      console.log(`Sage Success [${id}]:`, data);
      return data;
    } catch (error: any) {
      console.error(
        `Sage Failed [${id}]:`,
        error.response?.data || error.message,
      );
    }
  };

  await sendRequest(product.productId, product.name, product.pricing.price);

  // if (product.variations && product.variations.length > 0) {
  //   for (const variation of product.variations) {
  //     if (variation.options) {
  //       for (const option of variation.options) {
  //         const variationName = `${product.name} (${option.label})`;
  //         await sendRequest(option.sku, variationName, option.price);
  //       }
  //     }
  //   }
  // }
};

// getInvoicePdfFromSage
const getInvoicePdfFromSage = async (orderId: string) => {
  try {
    const order = await Order.findOne({ orderId });

    if (!order || !order.sageSync?.invoiceNo) {
      throw new Error('Order not found or invoice number not found.');
    }

    const { invoiceNo } = order.sageSync;
    const url = `${config.sage.api_url}/api/documents/sale/pdf`;

    const response = await axios.get(url, {
      params: {
        copies: '1',
        TransDocNumber: invoiceNo,
        TransDocument: 'FS',
        TransSerial: '1',
      },
      headers: {
        accessKey: config.sage.access_key,
        Accept: '*/*',
      },
    });

    if (response.data && response.data.PDF) {
      return response.data.PDF;
    }
    console.log({ response });
    return response.data;
  } catch (error: any) {
    console.error(
      'Sage Invoice PDF Fetch Error:',
      error.response?.data || error.message,
    );
    throw error;
  }
};

export const SageService = {
  mapOrderToSagePayload,
  syncOrderWithSage,
  syncProductToSage,
  getInvoicePdfFromSage,
};
