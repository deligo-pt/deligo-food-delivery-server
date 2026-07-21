/* eslint-disable @typescript-eslint/no-explicit-any */
import { TLanguageCode } from '../../constant/GlobalInterface/language.interface';

export const formatCheckoutResponse = (
  checkoutData: any,
  lang: TLanguageCode = 'en',
) => {
  if (!checkoutData) return checkoutData;

  const transformedCheckout = JSON.parse(JSON.stringify(checkoutData));

  if (Array.isArray(transformedCheckout)) {
    return transformedCheckout.map((singleCheckout) =>
      processSingleCheckout(singleCheckout, lang),
    );
  }

  return processSingleCheckout(transformedCheckout, lang);
};

const processSingleCheckout = (checkout: any, lang: TLanguageCode) => {
  if (!checkout || !checkout.items || !Array.isArray(checkout.items)) {
    return checkout;
  }

  checkout.items = checkout.items.map((item: any) => {
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

  return checkout;
};
