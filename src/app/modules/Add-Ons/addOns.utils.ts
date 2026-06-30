/* eslint-disable @typescript-eslint/no-explicit-any */
import { TLanguageCode } from '../../constant/GlobalInterface/language.interface';

export const formatAddonGroupResponse = (data: any, lang: TLanguageCode) => {
  const formatSingleGroup = (item: any) => {
    const itemObj = item.toObject?.() || item;

    const title = itemObj.title?.[lang] || itemObj.title?.['en'] || '';

    const options = Array.isArray(itemObj.options)
      ? itemObj.options.map((opt: any) => ({
          ...opt,
          name: opt.name?.[lang] || opt.name?.['en'] || '',
        }))
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
