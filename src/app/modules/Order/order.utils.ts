import crypto from 'crypto';
import mongoose from 'mongoose';
import { TLanguageCode } from '../../constant/GlobalInterface/language.interface';
import { TOrder, TOrderStatusHistory } from './order.interface';
import { OrderStatus, PICKUP_CODE_LENGTH } from './order.constant';
import { HydratedDocument } from 'mongoose';

export const generatePickupCode = (): { code: string; codeHash: string } => {
  const code = crypto
    .randomInt(0, 10 ** PICKUP_CODE_LENGTH)
    .toString()
    .padStart(PICKUP_CODE_LENGTH, '0');
  return { code, codeHash: hashPickupCode(code) };
};

export const hashPickupCode = (code: string): string =>
  crypto.createHash('sha256').update(code).digest('hex');

/* eslint-disable @typescript-eslint/no-explicit-any */
export const formatOrderResponse = (
  orderData: any,
  lang: TLanguageCode = 'en',
) => {
  if (!orderData) return orderData;

  const transformedOrder = JSON.parse(JSON.stringify(orderData));

  if (Array.isArray(transformedOrder)) {
    return transformedOrder.map((singleOrder) =>
      processSingleOrder(singleOrder, lang),
    );
  }

  return processSingleOrder(transformedOrder, lang);
};

/**
 */
const processSingleOrder = (order: any, lang: TLanguageCode) => {
  if (!order || !order.items || !Array.isArray(order.items)) {
    return order;
  }

  order.items = order.items.map((item: any) => {
    if (item.name && typeof item.name === 'object') {
      item.name = item.name[lang] || item.name['en'] || '';
    }

    if (item.addons && Array.isArray(item.addons)) {
      item.addons = item.addons.map((addon: any) => {
        if (addon.name && typeof addon.name === 'object') {
          addon.name = addon.name[lang] || addon.name['en'] || '';
        }
        return addon;
      });
    }

    return item;
  });

  return order;
};

type TOrderDocument = HydratedDocument<TOrder>;

type TUpdateStatusParams = {
  order: TOrderDocument;
  newStatus: OrderStatus;
  updatedBy?: mongoose.Types.ObjectId | string;
  note?: string;
};

export const updateOrderStatusHistory = ({
  order,
  newStatus,
  updatedBy,
  note,
}: TUpdateStatusParams): void => {
  order.orderStatus = newStatus;

  // 2. Ensure statusHistory array exists
  if (!Array.isArray(order.statusHistory)) {
    order.statusHistory = [];
  }

  const lastIndex = order.statusHistory.length - 1;
  const lastEntry = order.statusHistory[lastIndex];

  const updatedByObjectId = updatedBy
    ? new mongoose.Types.ObjectId(updatedBy)
    : undefined;

  if (lastEntry && lastEntry.status === newStatus) {
    lastEntry.timestamp = new Date();
    if (note !== undefined) {
      lastEntry.note = note;
    }
    if (updatedByObjectId) {
      lastEntry.updatedBy = updatedByObjectId;
    }

    order.markModified('statusHistory');
  } else {
    const newHistoryEntry: TOrderStatusHistory = {
      status: newStatus,
      timestamp: new Date(),
      ...(updatedByObjectId && { updatedBy: updatedByObjectId }),
      ...(note && { note }),
    };

    order.statusHistory.push(newHistoryEntry);
  }
};
