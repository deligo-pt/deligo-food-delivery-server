import { TLanguageCode } from '../../constant/GlobalInterface/language.interface';
import {
  BusinessCategoryTranslation,
  TBusinessCategoryName,
} from './category.interface';

export const formatBusinessCategoryResponse = (
  category: any,
  lang: TLanguageCode = 'en',
) => {
  if (Array.isArray(category)) {
    return category.map((item) => {
      const itemObj = item.toObject?.() || item;
      const translation =
        BusinessCategoryTranslation[itemObj.name as TBusinessCategoryName];

      return {
        ...itemObj,
        name: translation?.[lang] || translation?.['en'] || itemObj.name,
      };
    });
  }

  const categoryObj = category.toObject?.() || category;
  const translation =
    BusinessCategoryTranslation[categoryObj.name as TBusinessCategoryName];

  return {
    ...categoryObj,
    name: translation?.[lang] || translation?.['en'] || categoryObj.name,
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
