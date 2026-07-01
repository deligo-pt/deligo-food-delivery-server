/* eslint-disable @typescript-eslint/no-explicit-any */
import { TLanguageCode } from '../../constant/GlobalInterface/language.interface';

export const formatBusinessCategoryResponse = (
  category: any,
  lang: TLanguageCode = 'en',
) => {
  if (Array.isArray(category)) {
    return category.map((item) => {
      const itemObj = item.toObject?.() || item;

      return {
        ...itemObj,
        name: itemObj.name?.[lang] || itemObj.name?.['en'] || '',
      };
    });
  }

  const categoryObj = category.toObject?.() || category;

  return {
    ...categoryObj,
    name: categoryObj.name?.[lang] || categoryObj.name?.['en'] || '',
  };
};

export const formatProductCategoryResponse = (
  data: any,
  lang: TLanguageCode,
) => {
  if (Array.isArray(data)) {
    return data.map((item) => {
      const itemObj = item.toObject?.() || item;
      return {
        ...itemObj,
        name: itemObj.name?.[lang] || itemObj.name?.['en'] || '',
      };
    });
  }

  const dataObj = data.toObject?.() || data;
  return {
    ...dataObj,
    name: dataObj.name?.[lang] || dataObj.name?.['en'] || '',
  };
};
export const formatCuisineResponse = (data: any, lang: TLanguageCode) => {
  if (Array.isArray(data)) {
    return data.map((item) => {
      const itemObj = item.toObject?.() || item;
      return {
        ...itemObj,
        name: itemObj.name?.[lang] || itemObj.name?.['en'] || '',
      };
    });
  }

  const dataObj = data.toObject?.() || data;
  return {
    ...dataObj,
    name: dataObj.name?.[lang] || dataObj.name?.['en'] || '',
  };
};
