import {
  BusinessCategoryTranslation,
  TBusinessCategoryName,
} from './category.interface';

export const formatCategoryResponse = (
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
