import { TLanguageCode } from '../../constant/GlobalInterface/language.interface';

/* eslint-disable @typescript-eslint/no-explicit-any */
export const formatVendorResponse = (
  vendor: any,
  lang: TLanguageCode = 'en',
): any => {
  if (Array.isArray(vendor)) {
    return vendor.map((item) => formatSingleVendor(item, lang));
  }
  return formatSingleVendor(vendor, lang);
};

const formatSingleVendor = (item: any, lang: TLanguageCode): any => {
  if (!item) return null;

  const itemObj = item.toObject?.() || item;

  if (itemObj.businessDetails?.businessType) {
    const bType = itemObj.businessDetails.businessType;

    if (bType && typeof bType === 'object' && bType.name) {
      itemObj.businessDetails.businessTypeSlug = bType.slug || '';
      itemObj.businessDetails.businessType =
        bType.name[lang] || bType.name['en'] || '';
    } else if (typeof bType === 'object' && bType._id) {
      itemObj.businessDetails.businessType = '';
      itemObj.businessDetails.businessTypeSlug = '';
    }
  }

  if (Array.isArray(itemObj.cuisinesData) && itemObj.cuisinesData.length > 0) {
    itemObj.businessDetails.restaurantCuisineType = itemObj.cuisinesData.map(
      (cuisine: any) => cuisine.name?.[lang] || cuisine.name?.['en'] || '',
    );
  } else if (Array.isArray(itemObj.businessDetails?.restaurantCuisineType)) {
    itemObj.businessDetails.restaurantCuisineType =
      itemObj.businessDetails.restaurantCuisineType.map((c: string) =>
        typeof c === 'string' ? c.charAt(0).toUpperCase() + c.slice(1) : c,
      );
  }

  delete itemObj.cuisinesData;

  return itemObj;
};
