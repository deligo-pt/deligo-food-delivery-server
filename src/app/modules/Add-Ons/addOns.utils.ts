/* eslint-disable @typescript-eslint/no-explicit-any */
import { TLanguageCode } from '../../constant/GlobalInterface/language.interface';
import { formatTaxResponse } from '../Tax/tax.utils';

export const formatAddonGroupResponse = (data: any, lang: TLanguageCode) => {
  const formatSingleGroup = (item: any) => {
    const itemObj = item.toObject?.() || item;

    const title = itemObj.title?.[lang] || itemObj.title?.['en'] || '';

    const options = Array.isArray(itemObj.options)
      ? itemObj.options.map((opt: any) => {
          const formattedTax = opt.tax
            ? formatTaxResponse(opt.tax, lang)
            : opt.tax;

          return {
            ...opt,
            name: opt.name?.[lang] || opt.name?.['en'] || '',
            tax: formattedTax,
          };
        })
      : [];

    return {
      ...itemObj,
      title,
      options,
    };
  };

  if (Array.isArray(data)) {
    return data.map((item) => formatSingleGroup(item));
  }

  return formatSingleGroup(data);
};
