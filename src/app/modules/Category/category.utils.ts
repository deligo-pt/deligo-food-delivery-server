import {
  BusinessCategoryTranslation,
  TBusinessCategoryName,
} from './category.interface';

export const formatBusinessCategoryResponse = (
  category: any,
  lng: 'en' | 'pt' = 'en',
) => {
  const categoryObj = category.toObject ? category.toObject() : category;
  const translation =
    BusinessCategoryTranslation[categoryObj.name as TBusinessCategoryName];

  return {
    _id: categoryObj._id,
    name: translation?.[lng] || translation?.['en'] || categoryObj.name,
    slug: categoryObj.slug,
    icon: categoryObj.icon,
    isActive: categoryObj.isActive,
    isDeleted: categoryObj.isDeleted,
    createdAt: categoryObj.createdAt,
    updatedAt: categoryObj.updatedAt,
  };
};

export const formatProductCategoryResponse = (data: any, lng: string) => {
  if (Array.isArray(data)) {
    return data.map((item) => {
      const itemObj = item.toObject?.() || item;
      return {
        ...itemObj,
        name: itemObj.name?.[lng] || itemObj.name?.['en'] || '',
      };
    });
  }

  const dataObj = data.toObject?.() || data;
  return {
    ...dataObj,
    name: dataObj.name?.[lng] || dataObj.name?.['en'] || '',
  };
};
export const formatCuisineResponse = (data: any, lng: string) => {
  if (Array.isArray(data)) {
    return data.map((item) => {
      const itemObj = item.toObject?.() || item;
      return {
        ...itemObj,
        name: itemObj.name?.[lng] || itemObj.name?.['en'] || '',
      };
    });
  }

  const dataObj = data.toObject?.() || data;
  return {
    ...dataObj,
    name: dataObj.name?.[lng] || dataObj.name?.['en'] || '',
  };
};
