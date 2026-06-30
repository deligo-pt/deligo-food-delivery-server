import { TLanguageCode } from '../../constant/GlobalInterface/language.interface';

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
