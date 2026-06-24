import {
  BusinessCategoryTranslation,
  TBusinessCategoryName,
} from './category.interface';

export const formatBusinessCategoryResponse = (
  category: any,
  lang: 'en' | 'pt' = 'en',
) => {
  const categoryObj = category.toObject ? category.toObject() : category;
  const translation =
    BusinessCategoryTranslation[categoryObj.name as TBusinessCategoryName];

  return {
    _id: categoryObj._id,
    name: translation?.[lang] || translation?.['en'] || categoryObj.name,
    slug: categoryObj.slug,
    icon: categoryObj.icon,
    isActive: categoryObj.isActive,
    isDeleted: categoryObj.isDeleted,
    createdAt: categoryObj.createdAt,
    updatedAt: categoryObj.updatedAt,
  };
};

export const formatProductCategoryResponse = (data: any, lang: 'en' | 'pt') => {
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
export const formatCuisineResponse = (data: any, lang: 'en' | 'pt') => {
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
