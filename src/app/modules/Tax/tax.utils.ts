import { TLanguageCode } from '../../constant/GlobalInterface/language.interface';

export const formatTaxResponse = (taxData: any, lang: TLanguageCode = 'en') => {
  const formatSingleTax = (item: any) => {
    const itemObj = item.toObject?.() || item;

    return {
      ...itemObj,
      taxName: itemObj.taxName?.[lang] || itemObj.taxName?.['en'] || '',

      description:
        itemObj.description?.[lang] || itemObj.description?.['en'] || '',

      taxExemptionReason:
        itemObj.taxExemptionReason?.[lang] ||
        itemObj.taxExemptionReason?.['en'] ||
        '',
    };
  };

  if (Array.isArray(taxData)) {
    return taxData.map((item) => formatSingleTax(item));
  }

  return formatSingleTax(taxData);
};
