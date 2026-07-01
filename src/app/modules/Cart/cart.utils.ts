/* eslint-disable @typescript-eslint/no-explicit-any */
import { TLanguageCode } from '../../constant/GlobalInterface/language.interface';

export const formatCartResponse = (
  cartData: any,
  lang: TLanguageCode = 'en',
) => {
  if (!cartData || !cartData.items) return cartData;

  const transformedCart = JSON.parse(JSON.stringify(cartData));

  transformedCart.items = transformedCart.items.map((item: any) => {
    if (item.name && typeof item.name === 'object') {
      item.name = item.name[lang] || item.name['en'] || '';
    }

    if (item.product) {
      if (item.product.name) {
        item.product.name =
          typeof item.product.name === 'object'
            ? item.product.name[lang] || item.product.name['en'] || ''
            : item.product.name;
      }
      if (item.product.description) {
        item.product.description =
          typeof item.product.description === 'object'
            ? item.product.description[lang] ||
              item.product.description['en'] ||
              ''
            : item.product.description;
      }
    }

    if (item.addons && Array.isArray(item.addons)) {
      item.addons = item.addons.map((addon: any) => {
        if (addon.name && typeof addon.name === 'object') {
          addon.name = addon.name[lang] || addon.name['en'] || '';
        } else if (
          addon.addonId &&
          addon.addonId.name &&
          typeof addon.addonId.name === 'object'
        ) {
          addon.name =
            addon.addonId.name[lang] || addon.addonId.name['en'] || '';
        }
        return addon;
      });
    }

    return item;
  });

  return transformedCart;
};
